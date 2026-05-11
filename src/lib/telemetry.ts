/**
 * telemetry.ts
 * Fire-and-forget prediction event logger.
 *
 * Captures anonymized prediction metadata for:
 *   - Calibration analysis (predicted probability vs actual placements)
 *   - Model drift detection
 *   - Usage analytics (per-course, per-aggregate-bucket traffic)
 *   - Premium conversion signals
 *
 * Privacy design:
 *   - No PII stored — aggregate is bucketed, not exact
 *   - No school names — only tier/category distribution
 *   - No userId — never correlatable to individuals
 *   - All writes are fire-and-forget (never blocks the response)
 *
 * Firebase path: telemetry/predictions/{push_key}
 */

export interface PredictionTelemetryEvent {
  ts:              number;   // Unix ms — for time-series bucketing
  aggBucket:       string;   // e.g. "09-11" — NOT exact aggregate
  course:          string;   // CSSPS program type
  schoolCount:     number;   // How many schools in the request
  avgProbability:  number;   // Mean probability across schools (0–100)
  topProbability:  number;   // Highest probability school
  avgConfidence:   number;   // Mean confidence (0–100)
  hasSafeBet:      boolean;  // Whether any school scored as safe bet
  isPremium:       boolean;  // Whether user has premium at request time
  regionFlags:     number;   // How many schools had a region flag set
}

/**
 * Bucket an exact aggregate into an anonymized range string.
 * Ranges are coarse enough to prevent aggregate re-identification.
 */
export function bucketAggregate(agg: number): string {
  if (agg <= 8)  return '06-08';
  if (agg <= 11) return '09-11';
  if (agg <= 14) return '12-14';
  if (agg <= 17) return '15-17';
  if (agg <= 20) return '18-20';
  if (agg <= 24) return '21-24';
  if (agg <= 30) return '25-30';
  return '31+';
}

/**
 * Logs a prediction event to Firebase.
 * Called after a successful prediction — never awaited by the caller.
 * Silent on any error so it never affects the prediction response.
 */
export function logPredictionEvent(event: PredictionTelemetryEvent): void {
  // Intentionally NOT async — caller uses void; errors are swallowed silently
  (async () => {
    try {
      const { rtdb }  = await import('@/lib/firebase');
      const { ref, push } = await import('firebase/database');
      await push(ref(rtdb, 'telemetry/predictions'), event);
    } catch {
      // Telemetry failure is always silent — never breaks a user request
    }
  })();
}

/**
 * Convenience builder — extracts telemetry fields from prediction outputs.
 */
export function buildPredictionEvent(
  aggregate:       number,
  course:          string,
  results:         Array<{ probability: number; confidence: number; safeBet?: boolean }>,
  isPremium:       boolean,
  regionFlagsObj:  Record<string, boolean> = {},
): PredictionTelemetryEvent {
  const probs = results.map(r => r.probability);
  const confs = results.map(r => r.confidence);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    ts:             Date.now(),
    aggBucket:      bucketAggregate(aggregate),
    course,
    schoolCount:    results.length,
    avgProbability: avg(probs),
    topProbability: probs.length ? Math.max(...probs) : 0,
    avgConfidence:  avg(confs),
    hasSafeBet:     results.some(r => r.safeBet),
    isPremium,
    regionFlags:    Object.keys(regionFlagsObj).length,
  };
}
