# ChanceSHS Full Audit — Part 3: Auth, Calculator, Premium UI, Pricing

---

## 11. Authentication (`src/contexts/AuthContext.tsx`)

Uses **Firebase passwordless email-link authentication** (`sendSignInLinkToEmail` / `signInWithEmailLink`).

### Sign-in Flow

1. User enters email → `sendSignInLink(email)` → magic link sent, redirects to `/calculator`
2. On page load, `isSignInWithEmailLink(auth, window.location.href)` detects link
3. Reads stored email from `localStorage('chanceshs_auth_email')`
4. If no stored email (cross-device): calls `window.prompt()` — **native browser dialog, not a modal**
5. `signInWithEmailLink(auth, email, href)` completes sign-in
6. Clears auth email from localStorage and URL params

### `getUserIdentifier(email)`

```typescript
if (email) return email.toLowerCase().trim();
if (legacyId) return legacyId; // localStorage fallback
return '';
```

Email (lowercased, trimmed) is the canonical userId across all entitlement lookups. Enables cross-device access since entitlements are keyed by email in Firebase.

### Bug: `window.prompt()` on Line 53

The cross-device sign-in path uses a native browser prompt. This:
- Breaks UI consistency (plain OS dialog vs. styled app)
- Is blocked by many browser extensions and popup blockers
- Fails under strict CSP policies
- Is particularly bad for mobile UX

**Fix required:** Replace with a custom inline email input modal.

---

## 12. Legacy `useAuth` Hook (`src/hooks/useAuth.ts`)

This hook generates random localStorage user IDs and is **NOT the active auth system**. AuthContext.tsx is.

What it does:
1. Reads `chanceshs_user_id` from localStorage
2. If absent, generates `user_{timestamp}_{random7}` and stores it
3. Calls `/api/entitlements/check` 3 times in parallel for different feature types

The localStorage ID this creates is **not linked to email auth** — entitlements stored under this random ID are not accessible after browser storage is cleared or on a different device.

**Action required:** Delete this file before launch to prevent accidental import.

---

## 13. Calculator Page (`src/app/calculator/page.tsx`)

### Step Flow

| Step | UI |
|------|----|
| 1 | 4 core grades (1–9) + 2 best elective grades + raw score (0–600) + course selection |
| 2 | Search and select up to 6 schools + optional region flags for boarding/Cat A/B |
| Loading | `ModernResults` animated progress screen |
| 3 | Free: prediction cards + premium upsell. Premium: full `PremiumReport`. |

### State Architecture

- `useCalculatorStore` (Zustand) persists `grades`, `selectedSchools`, `course`, `isPremium` across navigations
- Auth from `useAuth` (AuthContext): `user`, `email`, `isAuthenticated`
- `results`, `hiddenOpportunities`, `predDataManifest`, `suggestions` are local state (not persisted)

### Prediction API Call

Passes `userId: authEmail || userId` — email first (Firebase Auth), falls back to legacy localStorage ID. Correct priority.

### School Constraints (enforced in `toggleSchool`)

- Max 6 schools total
- Max 1 Category A school
- Both limits trigger `showAlert()` modal (not native `window.alert()`)

### Raw Score Validation Bug

```typescript
if (rawScore === 0 || rawScore < 0 || rawScore > 600) { // blocks 0 as invalid
```

`rawScore === 0` blocks a theoretically valid (if unlikely) score of zero. Better check: use `rawScore === null` or a nullable state type.

### Social Proof Number Bug

```typescript
const baseNumber = 150 + Math.floor(Math.random() * 100); // line 179
```

This number is **fabricated and re-generated on every render**. It changes each time component state updates. The display implies real concurrent users. This is misleading UX.

### Legacy Payment Path (`handleLegacyPayment`)

Lines 196–235 contain a legacy `react-paystack` inline popup path that:
- Uses hardcoded amount of 3000 pesewas (GHS 30.00)
- Does NOT call `/api/payment/initialize`
- Does NOT create a Firebase payment record
- Sets `isPremium(true)` via Zustand only — no server-side entitlement created
- Bypasses the entire entitlement system entirely

This function exists in the codebase but is not wired to any active CTA button in the current render. **It must be removed** to prevent any future accidental connection.

### Price Inconsistency — CRITICAL

| Location | Price Shown |
|----------|-------------|
| Firebase product record | GHS 40.00 ✓ |
| `pricing/page.tsx` product card | GHS 40 ✓ |
| `calculator/page.tsx` PaymentModal display | GHS 40 ✓ |
| `calculator/page.tsx` premium-modal subtitle (line 1462) | **GHS 30** ✗ |
| `calculator/page.tsx` premium-modal price block (line 1505) | **GHS 30.00** ✗ |
| `calculator/page.tsx` premium upsell CTA label (line 1398) | **"GHS 30"** ✗ |

The actual Paystack charge is always based on the Firebase product price (GHS 40). The three "GHS 30" display instances in the premium modal/upsell block create a false expectation — users will see GHS 30 in the calculator, then be charged GHS 40 by Paystack.

### Post-Payment Polling (`pollForPremiumAccess`)

After Paystack redirect, polls `/api/entitlements/check` every 2 seconds, max 10 attempts (20 seconds total). If still no access after 10 attempts, shows a "still processing" alert advising manual page refresh.

This handles the webhook race condition correctly — the Paystack redirect callback may return before the webhook has granted the entitlement.

---

## 14. Free User Experience

### What Free Users See (Step 3)

- Result cards for all selected schools (up to 6)
- Positions 1–5: probability %, confidence bar, tier badge, category badge, safeBet/highRisk pills
- Positions 6+: school name visible, probability locked (Lock icon, no value)
- Average probability and confidence in hero card
- "More Schools" teaser with real school names from suggestion engine (probabilities blurred)
- Blurred application strategy + risk analysis preview
- Premium upsell feature list + CTA

### Lock Mechanism

`locked = true` is set **server-side** in `/api/predict`. The probability field is `undefined` in the API response for locked cards — it is not merely hidden by CSS. The lock is real.

### Suggestion Engine (`/api/schools/suggest`)

Fires in background after the main `/api/predict` call. Returns schools the user didn't select but qualifies for. Used to populate the "More Schools" teaser card and the blurred preview section with real school names.

---

## 15. Premium Report (`src/components/PremiumReport.tsx`)

### Props (typing weakness)

```typescript
grades: any;    // should reference engine's Grade interface
results: any[]; // should reference engine's PredictionResult interface
```

### Report Sections

1. **Data Freshness Banner** — monthly age of `dataManifest.lastUpdated`, yellow/red banners
2. **Executive Summary** — 4 stat cards: aggregate + raw score, avg probability, avg confidence, school count + safe match count
3. **Anomaly Warning** — shown only when `anomalyDetection.hasAnomaly === true`
4. **Full Rankings** — all results sorted descending by probability, probability bar, tier/safeBet/highRisk badges
5. **Application Strategy** — pill distribution (safe/competitive/high-risk counts), strategy rationale text, recommendation string
6. **Safe Bet Schools** — filtered list ≥70% probability
7. **Risk Analysis** — filtered list <30% probability with contextual text
8. **Prediction Quality Analysis** — gauge + 4-factor breakdown: input completeness, historical data depth, grade consistency, course alignment
9. **School Choices (Strategy Cards)** — 1st choice detail card (probability, confidence, tier, probabilityRange, reasoning), backup choices list
10. **Quick Tips** — hardcoded recommendations — **BUG: line 685 incorrectly states 1st choice must be Cat A school** (CSSPS does not require this; F2 fix removed the constraint at input but the tip was not updated)
11. **School Breakdown** — per-school detail cards with 4 probability factors
12. **Action Plan** — 4-step timeline with CSSPS portal links
13. **Parent Summary** — 4 plain-language cards
14. **Contingency Plan** — 3 steps for if placement fails
15. **Hidden Opportunities** — edge-type cards with school, hiddenScore, probability, edgeExplanation
16. **Footer** — Download PDF, Share Image, WhatsApp Share buttons

### PDF Download

`html2canvas` + `jsPDF`. JPEG quality 0.82 at scale 1.5. Multi-page: loops adding image slices. Falls back to `window.print()` on failure with an error banner.

**Safari/iOS issue:** `html2canvas` is known to fail on complex CSS layouts in Safari. The print fallback works but produces inferior output.

### WhatsApp Share

Pre-send preview modal lets user toggle whether to include their aggregate. Opens `https://wa.me/?text=...` in new tab. Consent-first approach is good.

### Quick Tips Bug (line 685)

```tsx
{topSchool?.schoolName || 'Your top school'} is your 1st choice — that's correct since it's a Cat A school
```

This hardcodes the incorrect assumption that the top choice is Category A and that it must be. CSSPS allows any category as 1st choice. The F2 fix in the calculator removed the UI constraint but this tip was not updated.

---

## 16. Loading Screen (`src/components/ModernResults.tsx`)

5 animated steps × 1500ms = 7500ms total animation duration.

The API call typically completes in 1–3 seconds. The animation and API call are **decoupled**:
- `onComplete` fires when progress bar hits 100% (7500ms)
- `setIsLoading(false)` in the `finally` block fires when the API responds

Whichever fires first unmounts the component. On a cold Firebase connection (>7.5s), the animation completes first — fine. On a fast connection (<7.5s), the API response cuts the animation short — jarring UX.

The component header reads "AI-powered intelligence engine." The engine is a statistical model (normal CDF), not ML/AI.

---

## 17. Pricing Page (`src/app/pricing/page.tsx`)

### Product Prices on Pricing Page

| Product | Display Price | Firebase Price | Match |
|---------|--------------|----------------|-------|
| Premium Report | GHS 40 | GHS 40.00 | ✓ |
| Early Alert | GHS 15 | GHS 15.00 | ✓ |
| SHS Kit Bundler | GHS 25 | GHS 25.00 | ✓ |
| Bundle Complete | GHS 45 | GHS 45.00 | ✓ |
| Full Experience | GHS 55 | GHS 55.00 | ✓ |

Pricing page displays are consistent with Firebase. The price discrepancy is only in the calculator page.

### `handleEmailLoginSuccess` productMap Bug

```typescript
const productMap = {
  'premium_report': { name: 'Premium Report', price: 30 },    // wrong — actual: 40
  'early_alert': { name: 'Early Placement Alert', price: 10 }, // wrong — actual: 15
  'shs_kit_bundler': { name: 'SHS Kit Bundler', price: 5 },    // wrong — actual: 25
  'bundle_complete': { name: 'Complete Bundle', price: 38 },   // wrong — actual: 45
  'bundle_full': { name: 'Full Bundle', price: 42 },           // wrong — actual: 55
};
```

All 5 prices are wrong. This map is used to re-trigger `PaymentFlow` after email login — the wrong price appears in the `PaymentFlow` display modal only. The actual Paystack charge is determined server-side by the Firebase product record, so no incorrect charge occurs. But the display discrepancy erodes trust.

### Auth Gate

Requires email authentication before any purchase. Correct — ensures entitlements are linked to email for cross-device access.

### `handlePaymentSuccess` Redirect

```typescript
'premium_report'  → /calculator?payment_success=true&userId={userId}
'bundle_complete' → /calculator?payment_success=true&bundle=true
'bundle_full'     → /calculator?payment_success=true&bundle=true
'early_alert'     → /alerts?payment_success=true  ← correct here
```

But the server-side verify route sends `early_alert` to `/pricing?success=true`. Inconsistency: if the user completes MoMo payment and Paystack uses the server redirect URL, they land on `/pricing` instead of `/alerts`.

---

## 18. Design System (`src/app/globals.css`)

Font: **Outfit** (Google Fonts, weights 100–900). Both headings and body.

CSS custom properties:
```css
--color-primary: #F5A623        /* amber — CTAs, accents */
--color-secondary: #0F172A      /* dark navy — headings */
--color-background: #FAFAFA     /* page background */
--color-surface: #FFFFFF        /* cards */
--color-success: #10B981        /* safe/good */
--color-warning: #F5A623        /* competitive */
--color-danger: #F43F5E         /* high risk */
```

Tailwind is imported but the app primarily uses per-component CSS files (`CalculatorFlow.css`, `PremiumReport.css`, `ModernResults.css`, `Pricing.css`). This creates two parallel styling systems that can drift.
