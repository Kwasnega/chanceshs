import { getDatabase, ref, get, set, update } from 'firebase/database';
import crypto from 'crypto';

/**
 * Security & Fraud Prevention System
 * 
 * Protects against:
 * - Fake payment callbacks
 * - Repeated free access attempts
 * - API abuse
 * - Scraping of premium data
 * - Bypassing payment screens
 */

interface SecurityConfig {
  maxPaymentAttempts: number;
  maxApiRequests: number;
  rateLimitWindow: number;
  fraudThreshold: number;
  suspiciousIpThreshold: number;
}

const SECURITY_CONFIG: SecurityConfig = {
  maxPaymentAttempts: 5,              // Max payment attempts per hour
  maxApiRequests: 100,                // Max API requests per minute
  rateLimitWindow: 60000,             // 1 minute in milliseconds
  fraudThreshold: 3,                  // Fraud flags before blocking
  suspiciousIpThreshold: 10          // Failed attempts from same IP
};

/**
 * Webhook signature validation
 * CRITICAL: Never trust webhook data without signature verification
 */
export function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return false;
  }

  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const hashBuffer = Buffer.from(hash);

  // Use constant-time comparison to prevent timing attacks
  if (signatureBuffer.length !== hashBuffer.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signatureBuffer.length; i++) {
    result |= signatureBuffer[i] ^ hashBuffer[i];
  }

  return result === 0;
}

/**
 * Rate limiting for API endpoints
 */
export class RateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();

  static async check(userId: string, endpoint: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `${userId}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.rateLimitWindow;

    // Clean up expired entries
    for (const [k, v] of this.limits.entries()) {
      if (v.resetTime < now) {
        this.limits.delete(k);
      }
    }

    const limit = this.limits.get(key);

    if (!limit || limit.resetTime < now) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetTime: now + SECURITY_CONFIG.rateLimitWindow
      });
      return { allowed: true };
    }

    if (limit.count >= SECURITY_CONFIG.maxApiRequests) {
      return {
        allowed: false,
        retryAfter: limit.resetTime - now
      };
    }

    limit.count++;
    return { allowed: true };
  }

  static async logRateLimit(db: any, userId: string, endpoint: string, blocked: boolean) {
    const rateLimitRef = ref(db, `rate_limits/${userId}/${endpoint}`);
    await set(rateLimitRef, {
      userId,
      endpoint,
      count: blocked ? SECURITY_CONFIG.maxApiRequests : 1,
      windowStart: new Date(Date.now() - SECURITY_CONFIG.rateLimitWindow).toISOString(),
      windowEnd: new Date(Date.now() + SECURITY_CONFIG.rateLimitWindow).toISOString(),
      blocked,
      blockedUntil: blocked ? new Date(Date.now() + SECURITY_CONFIG.rateLimitWindow).toISOString() : null,
      blockReason: blocked ? 'Rate limit exceeded' : null,
      lastUpdated: new Date().toISOString()
    });
  }
}

/**
 * Fraud detection system
 */
export class FraudDetector {
  /**
   * Detect suspicious payment patterns
   */
  static async detectPaymentFraud(db: any, userId: string, email: string, ipAddress: string): Promise<{
    isSuspicious: boolean;
    reason?: string;
    shouldBlock: boolean;
  }> {
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);

    // Check if user has fraud flag
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      if (userData.fraudFlag) {
        return {
          isSuspicious: true,
          reason: 'User has existing fraud flag',
          shouldBlock: true
        };
      }

      // Check payment attempts in last hour
      const paymentAttemptsRef = ref(db, `payment_attempts/${userId}`);
      const paymentSnapshot = await get(paymentAttemptsRef);

      if (paymentSnapshot.exists()) {
        const attempts = paymentSnapshot.val();
        const recentAttempts = Object.values(attempts).filter((attempt: any) => {
          const attemptTime = new Date(attempt.timestamp);
          const oneHourAgo = new Date(Date.now() - 3600000);
          return attemptTime > oneHourAgo;
        });

        if (recentAttempts.length >= SECURITY_CONFIG.maxPaymentAttempts) {
          await this.logFraud(db, userId, 'payment_tampering', 'high', 'Too many payment attempts', ipAddress);
          return {
            isSuspicious: true,
            reason: 'Excessive payment attempts',
            shouldBlock: true
          };
        }
      }
    }

    // Check IP-based suspicious activity
    const ipRef = ref(db, `ip_tracking/${ipAddress}`);
    const ipSnapshot = await get(ipRef);

    if (ipSnapshot.exists()) {
      const ipData = ipSnapshot.val();
      if (ipData.failedAttempts >= SECURITY_CONFIG.suspiciousIpThreshold) {
        await this.logFraud(db, userId, 'suspicious_pattern', 'medium', 'Suspicious IP activity', ipAddress);
        return {
          isSuspicious: true,
          reason: 'Suspicious IP activity',
          shouldBlock: false // Warn but don't block yet
        };
      }
    }

    return {
      isSuspicious: false,
      shouldBlock: false
    };
  }

  /**
   * Log fraud detection event
   */
  static async logFraud(
    db: any,
    userId: string,
    type: 'payment_tampering' | 'access_bypass' | 'api_abuse' | 'suspicious_pattern',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const fraudRef = ref(db, `fraud_detection/${userId}/${Date.now()}`);
    await set(fraudRef, {
      userId,
      timestamp: Date.now(),
      type,
      severity,
      description,
      ipAddress,
      userAgent,
      resolved: false,
      createdAt: new Date().toISOString()
    });

    // Update user fraud flag if severity is high or critical
    if (severity === 'high' || severity === 'critical') {
      const userRef = ref(db, `users/${userId}`);
      await update(userRef, {
        fraudFlag: true,
        fraudFlagReason: description,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Check if user should be blocked
   */
  static async shouldBlockUser(db: any, userId: string): Promise<boolean> {
    const fraudRef = ref(db, `fraud_detection/${userId}`);
    const fraudSnapshot = await get(fraudRef);

    if (!fraudSnapshot.exists()) {
      return false;
    }

    const fraudRecords = Object.values(fraudSnapshot.val());
    const unresolvedFraud = fraudRecords.filter((record: any) => !record.resolved);

    // Block if user has critical fraud or multiple high-severity fraud
    const criticalFraud = unresolvedFraud.filter((r: any) => r.severity === 'critical');
    const highFraud = unresolvedFraud.filter((r: any) => r.severity === 'high');

    if (criticalFraud.length > 0 || highFraud.length >= SECURITY_CONFIG.fraudThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Track failed payment attempts
   */
  static async trackPaymentAttempt(db: any, userId: string, email: string, status: 'success' | 'failed', ipAddress: string) {
    const attemptRef = ref(db, `payment_attempts/${userId}/${Date.now()}`);
    await set(attemptRef, {
      userId,
      email,
      status,
      ipAddress,
      timestamp: new Date().toISOString()
    });

    // Track IP-based attempts
    const ipRef = ref(db, `ip_tracking/${ipAddress}`);
    const ipSnapshot = await get(ipRef);

    let failedAttempts = 0;
    if (ipSnapshot.exists()) {
      const ipData = ipSnapshot.val();
      failedAttempts = ipData.failedAttempts || 0;
    }

    if (status === 'failed') {
      failedAttempts++;
      await set(ipRef, {
        ipAddress,
        failedAttempts,
        lastAttempt: new Date().toISOString()
      });
    }
  }
}

/**
 * Request validation middleware
 */
export class RequestValidator {
  /**
   * Validate payment request
   */
  static validatePaymentRequest(body: any): { valid: boolean; error?: string } {
    const { productId, email, amount } = body;

    if (!productId || !email) {
      return { valid: false, error: 'Missing required fields' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Validate product
    const validProducts = ['premium_report', 'early_alert', 'bundle_complete', 'bundle_full'];
    if (!validProducts.includes(productId)) {
      return { valid: false, error: 'Invalid product ID' };
    }

    // Validate amount if provided
    if (amount && (typeof amount !== 'number' || amount <= 0)) {
      return { valid: false, error: 'Invalid amount' };
    }

    return { valid: true };
  }

  /**
   * Validate premium access request
   */
  static validateAccessRequest(userId: string, contentId: string): { valid: boolean; error?: string } {
    if (!userId || !contentId) {
      return { valid: false, error: 'Missing required parameters' };
    }

    // Validate userId format
    if (typeof userId !== 'string' || userId.length < 1) {
      return { valid: false, error: 'Invalid user ID' };
    }

    // Validate contentId format
    if (typeof contentId !== 'string' || contentId.length < 1) {
      return { valid: false, error: 'Invalid content ID' };
    }

    return { valid: true };
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Validate phone number format (Ghana)
   */
  static validatePhoneNumber(phone: string): boolean {
    const ghanaPhoneRegex = /^(\+233|0)?[2-9]\d{8}$/;
    return ghanaPhoneRegex.test(phone.replace(/\s/g, ''));
  }
}

/**
 * API abuse prevention
 */
export class AbusePrevention {
  /**
   * Detect API scraping patterns
   */
  static async detectScraping(db: any, userId: string, userAgent: string): Promise<boolean> {
    const scrapingRef = ref(db, `api_usage/${userId}`);
    const snapshot = await get(scrapingRef);

    if (!snapshot.exists()) {
      return false;
    }

    const usage = snapshot.val();
    const requests = Object.values(usage);

    // Check for rapid sequential requests (possible scraping)
    if (requests.length > 50) {
      const recentRequests = requests.slice(-50);
      const timeSpan = recentRequests.length * 100; // Assuming 100ms per request

      if (timeSpan < 5000) { // 50 requests in 5 seconds
        await FraudDetector.logFraud(db, userId, 'api_abuse', 'high', 'Rapid API requests', undefined, userAgent);
        return true;
      }
    }

    return false;
  }

  /**
   * Log API usage for monitoring
   */
  static async logApiUsage(db: any, userId: string, endpoint: string, userAgent: string) {
    const usageRef = ref(db, `api_usage/${userId}/${Date.now()}`);
    await set(usageRef, {
      userId,
      endpoint,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Security headers for API responses
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

/**
 * CORS configuration
 */
export const CORS_CONFIG = {
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

export default {
  validateWebhookSignature,
  RateLimiter,
  FraudDetector,
  RequestValidator,
  AbusePrevention,
  getSecurityHeaders,
  CORS_CONFIG,
  SECURITY_CONFIG
};
