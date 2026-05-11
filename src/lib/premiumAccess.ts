import { getDatabase, ref, get } from 'firebase/database';

interface PremiumAccessResult {
  isPremium: boolean;
  premiumProductId?: string;
  premiumSince?: string;
  premiumReference?: string;
  premiumExpiresAt?: string | null;
  error?: string;
}

interface ReportAccessResult {
  hasAccess: boolean;
  reportData?: any;
  error?: string;
}

/**
 * Server-side premium access validation
 * NEVER trust frontend state - always validate server-side
 */
export async function validatePremiumAccess(userId: string): Promise<PremiumAccessResult> {
  try {
    const db = getDatabase();
    const userRef = ref(db, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      return {
        isPremium: false,
        error: 'User not found'
      };
    }

    const userData = userSnapshot.val();

    // Check if user has premium access
    if (!userData.isPremium) {
      return {
        isPremium: false,
        error: 'Premium access not granted'
      };
    }

    // Check if premium access has expired (if expiration is set)
    if (userData.premiumExpiresAt) {
      const expirationDate = new Date(userData.premiumExpiresAt);
      const now = new Date();
      
      if (now > expirationDate) {
        // Premium has expired
        return {
          isPremium: false,
          error: 'Premium access has expired'
        };
      }
    }

    // Validate that premium access was granted by a verified payment
    if (!userData.premiumReference) {
      console.error(`User ${userId} has premium flag but no payment reference`);
      return {
        isPremium: false,
        error: 'Premium access verification failed - no payment reference'
      };
    }

    // Verify the payment exists and was successful
    const paymentRef = ref(db, `payments/${userData.premiumReference}`);
    const paymentSnapshot = await get(paymentRef);

    if (!paymentSnapshot.exists()) {
      console.error(`Payment reference ${userData.premiumReference} not found for user ${userId}`);
      return {
        isPremium: false,
        error: 'Premium access verification failed - payment not found'
      };
    }

    const paymentData = paymentSnapshot.val();

    if (paymentData.status !== 'success') {
      console.error(`Payment ${userData.premiumReference} is not successful for user ${userId}`);
      return {
        isPremium: false,
        error: 'Premium access verification failed - payment not successful'
      };
    }

    // Verify payment belongs to this user
    if (paymentData.userId && paymentData.userId !== userId) {
      console.error(`Payment ${userData.premiumReference} belongs to different user`);
      return {
        isPremium: false,
        error: 'Premium access verification failed - payment ownership mismatch'
      };
    }

    // All checks passed - premium access is valid
    return {
      isPremium: true,
      premiumProductId: userData.premiumProductId,
      premiumSince: userData.premiumSince,
      premiumReference: userData.premiumReference,
      premiumExpiresAt: userData.premiumExpiresAt
    };

  } catch (error) {
    console.error('Premium access validation error:', error);
    return {
      isPremium: false,
      error: 'Validation error occurred'
    };
  }
}

/**
 * Validate access to a specific report
 */
export async function validateReportAccess(userId: string, reportReference: string): Promise<ReportAccessResult> {
  try {
    // First validate premium access
    const premiumAccess = await validatePremiumAccess(userId);
    
    if (!premiumAccess.isPremium) {
      return {
        hasAccess: false,
        error: premiumAccess.error || 'Premium access required'
      };
    }

    // Check if user has access to this specific report
    const db = getDatabase();
    const reportRef = ref(db, `reports/${reportReference}`);
    const reportSnapshot = await get(reportRef);

    if (!reportSnapshot.exists()) {
      return {
        hasAccess: false,
        error: 'Report not found'
      };
    }

    const reportData = reportSnapshot.val();

    // Verify report belongs to this user
    if (reportData.userId !== userId) {
      console.error(`Report ${reportReference} belongs to different user`);
      return {
        hasAccess: false,
        error: 'Report access denied - ownership mismatch'
      };
    }

    return {
      hasAccess: true,
      reportData: reportData
    };

  } catch (error) {
    console.error('Report access validation error:', error);
    return {
      hasAccess: false,
      error: 'Validation error occurred'
    };
  }
}

/**
 * Check if user has specific product entitlement
 */
export async function validateProductEntitlement(userId: string, productId: string): Promise<boolean> {
  try {
    const premiumAccess = await validatePremiumAccess(userId);
    
    if (!premiumAccess.isPremium) {
      return false;
    }

    // Check if user purchased this specific product or a bundle that includes it
    const userProductId = premiumAccess.premiumProductId;
    
    const bundleProducts = {
      'bundle_complete': ['premium_report', 'early_alert'],
      'bundle_full': ['premium_report', 'early_alert']
    };

    // Direct product match
    if (userProductId === productId) {
      return true;
    }

    // Check bundle entitlements
    if (userProductId === 'bundle_complete' || userProductId === 'bundle_full') {
      const includedProducts = bundleProducts[userProductId];
      return includedProducts.includes(productId);
    }

    return false;

  } catch (error) {
    console.error('Product entitlement validation error:', error);
    return false;
  }
}

/**
 * Rate limiting helper for API endpoints
 * Prevents abuse of premium endpoints
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Generate secure access token for premium content
 * Tokens are short-lived and tied to specific content
 */
export function generateAccessToken(userId: string, contentId: string, expiresIn: number = 3600): string {
  const payload = {
    userId,
    contentId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000)
  };
  
  // In production, use a proper JWT library with secret key
  // For now, return a base64 encoded payload (NOT SECURE - for development only)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Validate access token
 */
export function validateAccessToken(token: string, userId: string, contentId: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (payload.userId !== userId || payload.contentId !== contentId) {
      return false;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
