# ChanceSHS Full Audit — Part 4: Bug Register & Launch Readiness

---

## Bug Register

### CRITICAL — Must fix before any real users pay

| ID | Issue | File | Line(s) |
|----|-------|------|---------|
| B1 | Premium modal/upsell CTA shows **"GHS 30"** but actual Paystack charge is **GHS 40** — users will feel deceived | `calculator/page.tsx` | 1398, 1462, 1505 |
| B2 | `handleEmailLoginSuccess` productMap in pricing has wrong prices for all 5 products (display-only, not charged, but erodes trust) | `pricing/page.tsx` | ~68–75 |
| B3 | `window.prompt()` for cross-device sign-in — blocked by popups/CSP, breaks mobile UX, inconsistent UI | `AuthContext.tsx` | 53 |
| B4 | `early_alert` server-side verify redirect goes to `/pricing` instead of `/alerts` | `api/payment/verify/route.ts` | ~111 |
| B5 | PremiumReport Quick Tip incorrectly says 1st choice "must be Cat A school" — factually wrong per CSSPS rules | `PremiumReport.tsx` | ~685 |

### HIGH — Should fix before launch

| ID | Issue | File | Line(s) |
|----|-------|------|---------|
| B6 | `getPaymentByReference` does full O(n) table scan — no Firebase index on `reference` field | `firebasePayment.ts` | ~235 |
| B7 | `initializeProducts()` called (writes 5 Firebase records) on EVERY payment initialization request | `api/payment/initialize/route.ts` | 79 |
| B8 | Social proof number is randomised on every render — fabricated and misleading | `calculator/page.tsx` | 179 |
| B9 | `rawScore === 0` incorrectly treated as "not entered" — blocks a valid edge-case input | `calculator/page.tsx` | 309 |
| B10 | Webhook `handleChargeSuccess` falls back to `customer.customer_code` (Paystack ID, not app userId) when `metadata.userId` is missing — would grant entitlements to wrong user | `api/webhooks/paystack/route.ts` | ~82 |
| B11 | `/api/entitlements/check` is completely unauthenticated — anyone can query any user's entitlements and personal data (email, phone, createdAt) | `api/entitlements/check/route.ts` | 1–92 |
| B12 | Security headers (`setSecurityHeaders`, `setCorsHeaders`) from `security.ts` are never called on any active API route | `security.ts` | — |
| B13 | Duplicate `getUser()` and `updatePaymentStatus()` functions defined locally in initialize route — local version uses raw string `'successful'` instead of `PaymentStatus.SUCCESSFUL` enum | `api/payment/initialize/route.ts` | 222–255 |

### MEDIUM — Should fix soon after launch

| ID | Issue | File | Line(s) |
|----|-------|------|---------|
| B14 | `ModernResults` animation (7.5s) is decoupled from API call — fast API responses cause jarring mid-animation cut | `ModernResults.tsx` | 40–58 |
| B15 | All rate limiters use in-memory Maps — don't persist across serverless instances or restarts | Multiple | — |
| B16 | `DATA_MANIFEST.lastUpdated` is a hardcoded string — must be manually updated after data refreshes, no automated sync | `dataManifest.ts` | — |
| B17 | `cutoffTrend` slope is computed in engine but not applied to the final probability — wasted computation, missed accuracy improvement | `predictionEngine.ts` | — |
| B18 | Tailwind CSS + per-component CSS files create two parallel styling systems that can drift | `globals.css` | 2 |
| B19 | PremiumReport `grades` and `results` props typed as `any` — no TypeScript protection | `PremiumReport.tsx` | ~12–18 |
| B20 | `html2canvas` PDF export fails on Safari/iOS — fallback to `window.print()` works but produces inferior output | `PremiumReport.tsx` | — |

### LOW — Cleanup / polish

| ID | Issue | File |
|----|-------|------|
| B21 | `src/services/predictionEngine.ts` (legacy, uses Math.random()) should be deleted | `services/predictionEngine.ts` |
| B22 | `src/hooks/useAuth.ts` (legacy localStorage userId hook) should be deleted | `hooks/useAuth.ts` |
| B23 | `handleLegacyPayment` function and `react-paystack` inline popup code should be removed | `calculator/page.tsx` |
| B24 | `generateAccessToken` / `validateAccessToken` in premiumAccess.ts are cryptographically unsound and unused — should be removed | `premiumAccess.ts` |
| B25 | Missing ARIA labels on payment modal buttons, lock icon cards have no descriptive text for screen readers | `calculator/page.tsx` |
| B26 | "AI-powered intelligence engine" label in ModernResults is marketing language — the engine is a statistical model (normal CDF), not ML/AI | `ModernResults.tsx` |

---

## Security Summary

| Area | Status | Notes |
|------|--------|-------|
| Paystack webhook signature verification | ✓ Correct | HMAC-SHA512, raw body preserved |
| Webhook replay attack prevention | ⚠ Partial | In-memory only, resets on restart |
| Payment amount integrity | ✓ Server-side | Amount always from Firebase product, never from client |
| Entitlement check authentication | ✗ Missing | Endpoint fully unauthenticated |
| API rate limiting | ⚠ Partial | In-memory, not shared across instances |
| Security headers on API routes | ✗ Missing | Functions exist in security.ts but not called |
| Input validation on predict route | ✓ Present | validatePredictionInput checks all fields |
| userId resolution in webhook | ⚠ Risk | Falls back to Paystack customer_code if metadata.userId missing |
| Server-side premium gating | ✓ Correct | Probabilities stripped server-side, not just hidden in UI |
| Cross-device auth | ✓ Works | Email-based userId enables cross-device entitlement access |

---

## Launch Readiness Verdict

### Can launch with:
- B3 (prompt → modal) fixed
- B1 (GHS 30 → GHS 40) fixed
- B4 (early_alert redirect) fixed
- B5 (wrong quick tip) fixed
- B10 (webhook userId fallback) fixed
- B11 (entitlements endpoint auth) fixed or marked internal-only

### Blocks on scale (not on soft launch):
- B6 (Firebase index on reference)
- B7 (initializeProducts on every call)
- B15 (in-memory rate limiters)

### Cleanup before public marketing:
- B21, B22, B23, B24 (dead code removal)
- B8 (fabricated social proof)
- B2 (wrong prices in productMap display)

### Estimated launch-critical fixes: 6 items (B1, B3, B4, B5, B10, B11)
All 6 are localized changes — no architectural rewrites required.

---

## File Inventory (all files audited)

| File | Role | Status |
|------|------|--------|
| `src/lib/predictionEngine.ts` | Core prediction engine | ✓ Sound, minor issues |
| `src/services/predictionEngine.ts` | LEGACY — random probabilities | ✗ Delete |
| `src/lib/dataManifest.ts` | Data provenance & freshness | ✓ Works, manual update needed |
| `src/lib/security.ts` | Security utilities | ⚠ Unused in active routes |
| `src/lib/premiumAccess.ts` | Access validation | ✓ Works, unsafe token fns present |
| `src/lib/firebasePayment.ts` | Payment & entitlement CRUD | ⚠ O(n) reference lookup |
| `src/lib/performance.ts` | Performance utilities | Not audited in depth |
| `src/app/api/predict/route.ts` | Prediction API | ✓ Server-side gating correct |
| `src/app/api/payment/initialize/route.ts` | Payment init | ⚠ Duplicate fns, initProducts on every call |
| `src/app/api/payment/verify/route.ts` | Payment verify | ⚠ Wrong early_alert redirect |
| `src/app/api/webhooks/paystack/route.ts` | Webhook handler | ⚠ userId fallback risk |
| `src/app/api/entitlements/check/route.ts` | Entitlement check | ✗ Unauthenticated |
| `src/contexts/AuthContext.tsx` | Firebase email auth | ⚠ window.prompt bug |
| `src/hooks/useAuth.ts` | LEGACY — random userId | ✗ Delete |
| `src/app/calculator/page.tsx` | Main calculator UI | ✗ Price inconsistency, legacy code |
| `src/components/PremiumReport.tsx` | Premium report component | ⚠ Wrong quick tip, weak typing |
| `src/components/ModernResults.tsx` | Loading animation | ⚠ Animation/API decoupled |
| `src/app/pricing/page.tsx` | Pricing page | ⚠ Wrong productMap prices in one fn |
| `src/app/globals.css` | Design tokens | ✓ Clean, dual system risk |
