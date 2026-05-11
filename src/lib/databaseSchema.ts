/**
 * ChanceSHS Database Schema Extension
 * 
 * This document defines the Firebase Realtime Database schema
 * for payment verification, premium access control, and related features.
 * 
 * Database Structure:
 * 
 * root/
 * ├── users/                    # User profiles and premium status
 * ├── payments/                 # Payment records and verification
 * ├── reports/                  # Generated premium reports
 * ├── alerts/                   # Alert subscriptions
 * ├── webhook_logs/             # Webhook event logs
 * ├── transfers/                # Revenue sharing transfers
 * ├── fraud_detection/         # Fraud detection records
 * ├── rate_limits/              # Rate limiting data
 * └── cache/                    # Performance cache
 */

/**
 * USERS COLLECTION SCHEMA
 * 
 * Path: users/{userId}
 * 
 * Contains user profile data and premium access flags.
 * All premium access must be validated server-side.
 */
export interface UserSchema {
  // Basic user info
  userId: string;
  email?: string;
  phone?: string;
  createdAt: string;
  lastUpdated: string;

  // Premium access flags (CRITICAL - never trust frontend)
  isPremium: boolean;                    // Server-side validated only
  premiumSince?: string;                 // ISO timestamp when premium was granted
  premiumReference?: string;             // Payment reference that granted premium
  premiumProductId?: string;            // Product ID that was purchased
  premiumExpiresAt?: string | null;     // ISO timestamp or null for lifetime
  premiumVerificationCount?: number;     // Number of times premium was re-verified

  // Prediction data
  aggregate?: number;
  course?: string;
  grades?: Record<string, number>;
  selectedSchools?: string[];

  // Security flags
  suspiciousActivity?: boolean;
  fraudFlag?: boolean;
  fraudFlagReason?: string;
  lastPaymentVerification?: string;
}

/**
 * PAYMENTS COLLECTION SCHEMA
 * 
 * Path: payments/{reference}
 * 
 * Stores all payment records from Paystack.
 * Used for verification and audit trails.
 */
export interface PaymentSchema {
  reference: string;                    // Unique Paystack reference
  amount: number;                       // Amount in pesewas (kobo)
  currency: string;                     // Currency code (GHS)
  status: 'success' | 'failed' | 'pending';
  paidAt?: string;                      // ISO timestamp when payment was successful
  channel: string;                      // Payment channel (mobile_money, card, etc.)
  
  // Product information
  productId: string;                    // Product ID purchased
  productName: string;                  // Product name
  productPrice: number;                 // Expected product price
  
  // Customer information
  userId?: string;                      // User ID (if logged in)
  email: string;                        // Customer email
  customerCode?: string;                // Paystack customer code
  
  // Metadata
  metadata: Record<string, any>;
  
  // Verification
  createdAt: string;                    // When payment record was created
  verifiedAt?: string;                  // When payment was verified
  verifiedBy?: 'webhook' | 'api';       // Verification method
  
  // Security
  ipAddress?: string;                   // IP address of payment initiator
  userAgent?: string;                   // User agent string
  fraudFlag?: boolean;                  // Fraud detection flag
  fraudReason?: string;                 // Reason for fraud flag
}

/**
 * REPORTS COLLECTION SCHEMA
 * 
 * Path: reports/{reference}
 * 
 * Stores generated premium strategy reports.
 * Access controlled by premium verification.
 */
export interface ReportSchema {
  reference: string;                    // Payment reference
  userId: string;                       // User ID
  productId: string;                    // Product ID
  
  // Report data
  studentData: {
    aggregate: number;
    course: string;
    grades: Record<string, number>;
    selectedSchools: string[];
  };
  
  schoolRanking: Array<{
    rank: number;
    schoolName: string;
    probability: number;
    matchType: string;
    category: 'safe' | 'competitive' | 'dream';
  }>;
  
  categories: {
    safe: Array<{
      schoolName: string;
      probability: number;
      recommendation: string;
    }>;
    competitive: Array<{
      schoolName: string;
      probability: number;
      recommendation: string;
    }>;
    dream: Array<{
      schoolName: string;
      probability: number;
      recommendation: string;
    }>;
  };
  
  riskAnalysis: {
    overallRisk: 'low' | 'medium' | 'high';
    highProbabilityCount: number;
    lowProbabilityCount: number;
    averageProbability: number;
    aggregateStrength: string;
    recommendations: string[];
  };
  
  recommendations: string[];
  parentSummary: string;
  
  // Metadata
  metadata: {
    generatedAt: string;
    generatedFor: string;
    dataBasedOn: string;
    disclaimer: string;
  };
  
  // Status
  status: 'pending' | 'ready' | 'failed';
  createdAt: string;
  generatedAt?: string;
  
  // Access control
  accessCount?: number;                 // Number of times report was accessed
  lastAccessedAt?: string;              // Last access timestamp
  downloadCount?: number;               // Number of PDF downloads
  lastDownloadedAt?: string;            // Last download timestamp
}

/**
 * ALERTS COLLECTION SCHEMA
 * 
 * Path: alerts/{reference}
 * 
 * Stores alert subscriptions for placement notifications.
 */
export interface AlertSchema {
  reference: string;                    // Payment reference
  userId: string;                       // User ID
  productId: string;                    // Product ID
  
  // Contact information
  email: string;
  phone: string | null;
  
  // Status
  status: 'active' | 'triggered' | 'failed' | 'unsubscribed';
  
  // Timestamps
  createdAt: string;
  triggeredAt?: string | null;
  
  // Delivery
  deliveryChannel?: 'sms' | 'whatsapp';
  deliveryAttempts?: number;
  lastDeliveryAttempt?: string;
  
  // Verification
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

/**
 * WEBHOOK LOGS COLLECTION SCHEMA
 * 
 * Path: webhook_logs/{timestamp}
 * 
 * Logs all webhook events for audit and debugging.
 */
export interface WebhookLogSchema {
  timestamp: number;                    // Unix timestamp
  event: string;                       // Event type (charge.success, etc.)
  reference?: string;                   // Payment reference
  receivedAt: string;                  // ISO timestamp
  processed: boolean;                  // Whether event was processed
  processedAt?: string;                // When processing completed
  error?: string;                      // Error message if processing failed
  payload?: Record<string, any>;        // Event payload (sanitized)
}

/**
 * TRANSFERS COLLECTION SCHEMA
 * 
 * Path: transfers/{reference}
 * 
 * Logs revenue sharing transfers.
 */
export interface TransferSchema {
  reference: string;                    // Transfer reference
  amount: number;                       // Transfer amount
  recipient: string;                    // Recipient identifier
  status: 'success' | 'failed' | 'pending';
  processedAt: string;                  // ISO timestamp
  metadata?: Record<string, any>;
}

/**
 * FRAUD DETECTION COLLECTION SCHEMA
 * 
 * Path: fraud_detection/{userId}/{timestamp}
 * 
 * Records suspicious activities for fraud prevention.
 */
export interface FraudDetectionSchema {
  userId: string;
  timestamp: number;
  type: 'payment_tampering' | 'access_bypass' | 'api_abuse' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolution?: string;
}

/**
 * RATE LIMITS COLLECTION SCHEMA
 * 
 * Path: rate_limits/{userId}/{endpoint}
 * 
 * Stores rate limiting data for API endpoints.
 */
export interface RateLimitSchema {
  userId: string;
  endpoint: string;
  count: number;                        // Request count
  windowStart: string;                  // ISO timestamp of window start
  windowEnd: string;                    // ISO timestamp of window end
  blocked: boolean;                     // Whether user is blocked
  blockedUntil?: string;                // ISO timestamp when block expires
  blockReason?: string;                 // Reason for block
}

/**
 * CACHE COLLECTION SCHEMA
 * 
 * Path: cache/{key}
 * 
 * Stores cached data for performance optimization.
 */
export interface CacheSchema {
  key: string;
  value: any;
  ttl: number;                          // Time to live in seconds
  createdAt: string;
  expiresAt: string;
  hitCount: number;                     // Number of cache hits
  lastAccessed: string;
}

/**
 * DATABASE INDEXING STRATEGY
 * 
 * Firebase Realtime Database doesn't support traditional indexing,
 * but we can optimize queries by structuring data appropriately.
 * 
 * Recommended query patterns:
 * 
 * 1. Users by premium status:
 *    - Query: users/{userId}/isPremium
 *    - Use separate index: premium_users/{userId}
 * 
 * 2. Payments by user:
 *    - Query: payments?orderByChild="userId"&equalTo="{userId}"
 * 
 * 3. Payments by status:
 *    - Query: payments?orderByChild="status"&equalTo="success"
 * 
 * 4. Reports by user:
 *    - Query: reports?orderByChild="userId"&equalTo="{userId}"
 * 
 * 5. Active alerts:
 *    - Query: alerts?orderByChild="status"&equalTo="active"
 * 
 * 6. Recent fraud detection:
 *    - Query: fraud_detection/{userId}?limitToLast=100
 */

/**
 * DATA INTEGRITY RULES
 * 
 * 1. Payment records must reference valid users
 * 2. Premium flags must reference valid payment records
 * 3. Reports must be tied to valid payment references
 * 4. Alert subscriptions must be tied to valid payments
 * 5. No duplicate payment references
 * 6. No duplicate premium grants for same reference
 * 7. Webhook events must be processed exactly once
 * 8. Fraud flags must be manually reviewed before action
 */

/**
 * SCALABILITY CONSIDERATIONS
 * 
 * 1. Use sharding for high-volume collections (payments, reports)
 *    - payments/{year}/{month}/{reference}
 *    - reports/{year}/{month}/{reference}
 * 
 * 2. Implement TTL for cached data
 *    - Auto-expire cache entries
 *    - Clean up old webhook logs
 * 
 * 3. Use denormalization for frequently accessed data
 *    - Cache user premium status in separate collection
 *    - Store report summaries in user records
 * 
 * 4. Implement pagination for large datasets
 *    - Limit query results
 *    - Use cursor-based pagination
 * 
 * 5. Monitor database size and implement cleanup
 *    - Archive old payment records
 *    - Clean up expired cache entries
 *    - Rotate webhook logs
 */

// Note: These are TypeScript type interfaces for documentation and type checking.
// They are not runtime values and should not be exported as objects.
