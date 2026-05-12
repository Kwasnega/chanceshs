# ChanceSHS Full Audit — Part 1: Prediction Engine & Data Layer

---

## 1. Prediction Engine (`src/lib/predictionEngine.ts`)

### School Tier Defaults (fallback when Firebase unavailable)

| Tier | Category | Default Cutoff | Default σ |
|------|----------|----------------|-----------|
| `elite_a` | A | 6 | 1.5 |
| `elite_b` | B | 9 | 2.0 |
| `elite_c` | C | 12 | 2.5 |
| `mid_tier` | D | 15 | 3.0 |
| `low_tier` | E | 20 | 4.0 |

### Statistical Model

The engine is marked "fully deterministic — no Math.random()" (line 368). Core is a **normal CDF** using the Abramowitz & Stegun polynomial approximation (max error 1.5e-7).

`trendWeightedMean`: weighted average of historical cutoffs — recent years get higher weight.
`cutoffStdDev`: sample std dev; returns 2.0 if only 1 data point.
`cutoffTrend`: least-squares slope over historical cutoffs.

### Prediction Steps (`predictWithSchoolData`)

1. Effective cutoff = trendWeightedMean if ≥2 data points, else single cutoff value
2. Sigma = historical std dev or tier default
3. Base probability = normalCDF(-(aggregate - effectiveCutoff) / sigma)
4. Raw score tiebreaker: (rawScore - 300) / 600 * 5 → ±5% adjustment
5. Elective alignment bonus from subjectWeights map
6. Program competitiveness adjustment (General Science at elite school = heaviest penalty)
7. School type adjustment (boarding = small negative; day = small negative for high-demand regions)
8. Region flag: isHomeRegion=true → +15%; false → -10%; undefined → no change
9. Final probability clamped to [1, 99], rounded
10. Confidence = f(data points count, cutoff volatility, tier)

### Category Rules

```
probability >= 70  → 'safe'   (also: safeBet = true)
probability 40-69  → 'competitive'
probability < 40   → 'dream'
probability < 30   → highRisk = true
index >= 5         → locked = true  (server-side, not just UI)
```

### Anomaly Detection

Severity-weighted penalty multipliers applied before final clamp:
- Low: ×0.95 | Medium: ×0.85 | High: ×0.75

Anomalies stored in `(window as any).anomalyDetection` and passed to PremiumReport.

### Hidden Opportunities (`findHiddenOpportunities`)

Secondary pass over full school catalogue. Edge types:
- `subject_mismatch` — school's dominant elective matches student's best grades
- `trend_window` — school's cutoff on downward trend
- `demand_gap` — school historically under-subscribed for this programme

Each opportunity has `hiddenScore` (0-100) and `edgeExplanation`. Premium-only.

### Known Issues

**MISS:** `cutoffTrend` slope is computed but **not applied** to the final probability — it's returned in results but does not modify the prediction.

**RISK:** `programCompatibility` in the result object has no independently documented formula.

**RISK:** Hardcoded fallback school data in predictionEngine.ts is of unknown completeness vs Firebase data.

---

## 2. Deprecated `src/services/predictionEngine.ts`

**This file must be deleted before launch.**

Uses `Math.random()` for all probability ranges:
```typescript
probability = Math.floor(Math.random() * (99 - 92 + 1) + 92); // random 92-99
```
Returns a different value on every call for identical inputs. NOT imported anywhere active. Exists only as a liability for accidental import.

---

## 3. Data Manifest (`src/lib/dataManifest.ts`)

`DATA_MANIFEST` documents version, lastUpdated, nextUpdate, sources, methodology, disclaimer, and per-school quality records.

`getDataFreshness()` returns:
- `'current'` if < 14 months old
- `'stale'` if 14-26 months old
- `'critical'` if > 26 months old

Consumed by: PremiumReport.tsx, calculator/page.tsx (data freshness banners), `/api/admin/data/status` (admin endpoint requiring `x-admin-secret` header).

**Issue:** `DATA_MANIFEST.lastUpdated` is a hardcoded string in source. Must be manually updated after data refreshes — no automated sync mechanism.

---

## 4. Security Layer (`src/lib/security.ts`)

### What Exists

- HMAC-SHA512 webhook signature verification (correct)
- In-memory rate limiter: sliding window, 10 req/min per IP
- Fraud detection: `detectPaymentFraud(userId, ipAddress)`, `detectSuspiciousActivity(ipAddress)`
- Input validation: `validatePaymentRequest`, `validateAccessRequest`, `sanitiseInput`
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, CORS restriction to NEXT_PUBLIC_APP_URL

### Critical Issue: Unused in Active Routes

The `setSecurityHeaders()` and `setCorsHeaders()` functions in security.ts are **NOT called** from `/api/predict`, `/api/payment/initialize`, or `/api/webhooks/paystack`. The security module exists but is largely not wired into the main endpoints.

### Rate Limiter Limitation

All rate limiters (security.ts, payment/initialize, predict) use in-memory Maps. These:
- Reset on every server restart
- Do NOT share state across multiple Vercel serverless instances

An attacker can exceed limits by hitting different serverless instances. Redis-backed rate limiting is required for production at scale.

---

## 5. Premium Access Library (`src/lib/premiumAccess.ts`)

### `validatePremiumAccess(userId)`

Returns true if:
- `user.entitlements.premium_report === true` OR
- `user.isPremium === true` OR
- A payment record exists with status='successful', productId in ['premium_report', 'bundle_complete', 'bundle_full'], within 365 days

### `validateProductEntitlement(userId, productId)`

Checks Firebase `users/{userId}/entitlements/{productId}`.
Bundle resolution: if productId='premium_report' and user has bundle_complete or bundle_full → returns true.

### Unsafe Token Functions

`generateAccessToken(userId)` and `validateAccessToken(token)` create/verify a base64-encoded `{userId, timestamp, nonce}` — **no cryptographic signature**. These are commented as insecure. NOT called from any active route, but present as a risk.
