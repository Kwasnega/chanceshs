# Firebase Database Schema for Payment & Entitlement System

## Database Structure

```
chanceshs-next/
├── users/
│   ├── {userId}/
│   │   ├── email: string
│   │   ├── phone: string
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── entitlements/
│   │       ├── premium_report: boolean
│   │       ├── early_alert: boolean
│   │       ├── shs_kit_preview: boolean
│   │       └── bundle_access: string[]
│
├── products/
│   ├── premium_report/
│   │   ├── id: "premium_report"
│   │   ├── name: "Premium Strategy Report"
│   │   ├── description: string
│   │   ├── price: 40.00
│   │   ├── currency: "GHS"
│   │   ├── type: "premium_report"
│   │   ├── features: array
│   │   └── isActive: true
│   │
│   ├── early_alert/
│   │   ├── id: "early_alert"
│   │   ├── name: "Early Placement Alert"
│   │   ├── description: string
│   │   ├── price: 15.00
│   │   ├── currency: "GHS"
│   │   ├── type: "early_alert"
│   │   ├── features: array
│   │   └── isActive: true
│   │
│   ├── bundle_complete/
│   │   ├── id: "bundle_complete"
│   │   ├── name: "Complete Peace of Mind"
│   │   ├── description: "Strategy Report + Early Alert"
│   │   ├── price: 45.00
│   │   ├── currency: "GHS"
│   │   ├── type: "bundle"
│   │   ├── includes: ["premium_report", "early_alert"]
│   │   └── isActive: true
│   │
│   └── bundle_full/
│       ├── id: "bundle_full"
│       ├── name: "Full Experience"
│       ├── description: "Report + Alert + Kit Preview"
│       ├── price: 55.00
│       ├── currency: "GHS"
│       ├── type: "bundle"
│       ├── includes: ["premium_report", "early_alert", "shs_kit_preview"]
│       └── isActive: true
│
├── payments/
│   ├── {paymentId}/
│   │   ├── userId: string
│   │   ├── productId: string
│   │   ├── productName: string
│   │   ├── reference: string (unique)
│   │   ├── amount: number
│   │   ├── currency: string
│   │   ├── status: "pending" | "processing" | "successful" | "failed" | "refunded"
│   │   ├── paymentMethod: "momo" | "card" | "bank_transfer"
│   │   ├── paymentProvider: "paystack"
│   │   ├── providerTransactionId: string
│   │   ├── providerResponse: object
│   │   ├── metadata: object
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── verifiedAt: timestamp
│
├── entitlements/
│   ├── {entitlementId}/
│   │   ├── userId: string
│   │   ├── paymentId: string
│   │   ├── featureType: "premium_report" | "early_alert" | "shs_kit_preview"
│   │   ├── isActive: boolean
│   │   ├── expiresAt: timestamp (optional)
│   │   ├── grantedAt: timestamp
│   │   └── metadata: object
│
├── premium_reports/
│   ├── {reportId}/
│   │   ├── userId: string
│   │   ├── paymentId: string
│   │   ├── reportData: object
│   │   ├── reportUrl: string
│   │   ├── isGenerated: boolean
│   │   ├── generatedAt: timestamp
│   │   └── createdAt: timestamp
│
├── alerts/
│   ├── {alertId}/
│   │   ├── userId: string
│   │   ├── paymentId: string
│   │   ├── phone: string
│   │   ├── email: string
│   │   ├── preferences: object
│   │   ├── isActive: boolean
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│
├── webhooks/
│   ├── {webhookId}/
│   │   ├── eventType: string
│   │   ├── payload: object
│   │   ├── signature: string
│   │   ├── processedAt: timestamp
│   │   └── status: "pending" | "processed" | "failed"
│
└── rate_limits/
    ├── {identifier}/
    │   ├── endpoint: string
    │   ├── count: number
    │   ├── windowStart: timestamp
    │   └── windowEnd: timestamp
```

## Indexing Rules

- `users/{userId}/entitlements/*` - Index for quick access checks
- `payments/` - Index by `userId`, `reference`, `status`
- `entitlements/` - Index by `userId`, `featureType`, `isActive`
- `webhooks/` - Index by `eventType`, `processedAt`
