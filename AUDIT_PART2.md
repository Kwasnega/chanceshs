# ChanceSHS Full Audit — Part 2: Payment System

---

## 6. Firebase Payment Library (`src/lib/firebasePayment.ts`)

### Product Catalogue

| Product ID | Name | Price |
|------------|------|-------|
| `premium_report` | Premium Strategy Report | GHS 40.00 |
| `early_alert` | Early Placement Alert | GHS 15.00 |
| `bundle_complete` | Complete Peace of Mind | GHS 45.00 |
| `bundle_full` | Full Experience | GHS 55.00 |
| `shs_kit_bundler` | SHS Kit Bundler | GHS 25.00 |

### Firebase Data Paths

| Path | Purpose |
|------|---------|
| `products/{productId}` | Product catalogue |
| `payments/{paymentId}` | Payment records |
| `entitlements/{entitlementId}` | Entitlement records (source of truth) |
| `users/{userId}/entitlements/{featureType}` | Quick lookup boolean |
| `users/{userId}` | User profile |
| `webhooks/{webhookId}` | Webhook event log |

### Key Functions

- `createPayment()` — pushes to `payments/`, returns paymentId
- `updatePaymentStatus()` — updates status, writes `verifiedAt` on success
- `getPaymentByReference(ref)` — **full O(n) table scan** of `payments/` node. No Firebase index defined on `reference` field. Performance degrades with payment volume.
- `checkUserEntitlement()` — direct read of `users/{userId}/entitlements/{featureType}` — O(1), correct.
- `createEntitlement()` — pushes to `entitlements/` AND writes `users/{userId}/entitlements/{featureType} = true`
- `grantBundleEntitlements()` — loops through included products and calls `createEntitlement()` for each

**Performance issue:** `getPaymentByReference` does a full scan of the payments table. Needs a Firebase index or a reference→paymentId denormalized lookup for production scale.

---

## 7. Payment Initialization (`src/app/api/payment/initialize/route.ts`)

### Flow

1. Rate limit by **email**, 10 req/min (in-memory Map)
2. Validates `productId` and `email` format
3. Calls `initializeProducts()` — **writes all 5 products to Firebase on EVERY call** — wasteful, potential race condition on parallel requests. Should run once at startup.
4. Fetches product from Firebase, validates it is active
5. Generates reference: `CHANCES_{timestamp}_{random7chars}`
6. Generates `finalUserId = userId || user_{timestamp}_{random7chars}`. If the caller does not supply a `userId`, a new random ID is generated server-side that may not match the client's stored userId.
7. Duplicate payment check — **full table scan** of `payments/` node (same O(n) issue)
8. Creates payment record with status `PENDING`
9. Calls Paystack `/transaction/initialize` with `channels: ['mobile_money']`
10. Updates payment to `PROCESSING`
11. Returns `{ authorizationUrl, reference, userId, paymentId, product }`

### Bugs

**Duplicate function definitions:** The route defines local `getUser()` and `updatePaymentStatus()` functions (lines 222–255) that **duplicate** the same functions in `firebasePayment.ts`. The local `updatePaymentStatus` uses the raw string `'successful'` instead of the `PaymentStatus.SUCCESSFUL` enum. This duplication is fragile.

**GET endpoint writes:** `GET /api/payment/initialize?productId=xxx` calls `initializeProducts()` and returns product details without auth. While product data is not sensitive, the Firebase write on every GET is wasteful.

---

## 8. Payment Verification (`src/app/api/payment/verify/route.ts`)

### GET Flow (Paystack redirect callback)

1. Reads `?reference=` from URL
2. Calls Paystack `GET /transaction/verify/{reference}` with Bearer token
3. `status !== 'success'` → updates payment to FAILED, redirects to `/pricing?error=payment_not_successful`
4. Fetches payment from Firebase by reference (full scan)
5. Already `SUCCESSFUL` check (idempotency) → redirects without re-granting entitlements
6. Updates payment to SUCCESSFUL
7. Calls `createEntitlement()` or `grantBundleEntitlements()` by productId
8. Redirects:
   - `premium_report` → `/calculator?step=3&payment_success=true&userId={userId}`
   - `bundle_complete` / `bundle_full` → `/calculator?payment_success=true&bundle=true&userId={userId}`
   - `early_alert` → `/pricing?success=true&product=early_alert`  ← **BUG: should go to `/alerts`**
   - others → `/pricing?success=true`

### POST Flow (client-side polling)

Same Paystack verification logic, returns JSON `{ success: true, payment }`. Used by client for manual verification after redirect.

### Bundle Entitlement Grants

- `bundle_complete` → grants `[PREMIUM_REPORT, EARLY_ALERT]` (2 entitlements)
- `bundle_full` → grants `[PREMIUM_REPORT, EARLY_ALERT]` + separate `SHS_KIT_PREVIEW` (3 entitlements)

This is correct per product definitions but should be tested explicitly.

---

## 9. Webhook (`src/app/api/webhooks/paystack/route.ts`)

### Signature Verification

```typescript
const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
if (hash !== signature) { return new Response('Invalid signature', { status: 400 }); }
```

Reads raw body as text before parsing JSON — correct. Signature must be verified against raw body, not parsed object.

### Replay Attack Prevention

```typescript
const processedEvents = new Map<string, number>(); // in-memory, 5-minute TTL
const eventId = `${event.event}_${event.data?.reference}_${event.data?.id}`;
if (processedEvents.has(eventId)) { return 'duplicate'; }
```

**Same single-process limitation** — does not persist across restarts or multiple serverless instances. A Paystack retry after a server restart would reprocess an event.

### Event Handling

- `charge.success` → `handleChargeSuccess` — fetches payment by reference, idempotency check, updates status, grants entitlements
- `charge.failed` → `handleChargeFailed` — updates payment to FAILED
- `transfer.success` / `transfer.failed` → log-only, no business logic

### userId Resolution in `handleChargeSuccess`

```typescript
const userId = event.data.metadata?.userId || event.data.customer?.customer_code || payment.userId;
```

`customer.customer_code` is a Paystack-generated code, NOT the app's userId. If `metadata.userId` is missing from the Paystack payload, entitlements would be granted under a Paystack customer code rather than the app's user identifier.

### Duplicate Entitlements on Retry

`createEntitlement()` always pushes a new record. A Paystack retry after partial processing could create duplicate entitlement records in `entitlements/`. The `checkUserEntitlement()` O(1) boolean flag lookup is unaffected — but duplicate records create garbage data in the database.

---

## 10. Entitlements Check (`src/app/api/entitlements/check/route.ts`)

### GET

`?userId=` or `?email=` (email normalised to lowercase). Optional `?featureType=`.

- With `featureType` → `{ userId, featureType, hasAccess: boolean }`
- Without `featureType` → `{ userId, entitlements: Record<string, boolean>, user: { email, phone, createdAt } }`

### POST

`{ userId, featureType }` body. Same check, returns JSON.

### CRITICAL Security Issue

**Both endpoints are completely unauthenticated.** Any caller who knows (or guesses) a user's email or userId can:
1. Check their entitlement status
2. Retrieve their email, phone number, and registration date

This is a data privacy violation. The endpoint should at minimum verify the request comes from the authenticated user it is querying about.
