/**
 * POST /api/calibration/outcome
 *
 * Stores a single prediction-vs-actual outcome record.
 * Called voluntarily by students after BECE placement results are released.
 *
 * Why this matters (Brier score calibration):
 *   If the engine predicts 70% for school X and the actual admission rate
 *   for students with that profile is only 40%, the model is overconfident.
 *   Storing these outcomes enables:
 *     - Brier score calculation (mean squared error of probability forecasts)
 *     - Calibration curves per school / tier / aggregate band
 *     - Confidence-interval validation
 *     - Future model recalibration
 *
 * Firebase path: calibration/outcomes/{pushKey}
 *
 * Rate limited: 3 submissions per IP per hour (prevents bulk poisoning).
 * No authentication required — voluntary, anonymous self-reporting.
 * PII design: no name, no email. Only schoolId, aggregate bucket, course, and outcome.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/requestLogger';
import { bucketAggregate } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

const VALID_COURSES = ['General Science', 'General Arts', 'Business', 'Agriculture', 'Visual Arts'];

// Rate limit: 3 outcome submissions per IP per hour
const outcomeRateMap = new Map<string, { count: number; resetAt: number }>();

function checkOutcomeRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = outcomeRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    outcomeRateMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export interface CalibrationOutcome {
  // Prediction inputs (anonymized)
  aggBucket:          string;   // e.g. "09-11" — NOT exact aggregate
  course:             string;
  // Prediction output at time of submission
  schoolId:           string;
  predictedProb:      number;   // 0–100 from engine
  predictedConf:      number;   // confidence 0–100 from engine
  // Actual outcome
  admitted:           boolean;  // true = student was placed at this school
  // Metadata
  beccYear:           number;   // Which BECE year (e.g. 2024)
  reportedAt:         string;   // ISO timestamp
}

export async function POST(request: NextRequest) {
  const log = createLogger(request);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (!checkOutcomeRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Submission limit reached. You can submit up to 3 outcomes per hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  try {
    const body = await request.json();
    const { aggregate, course, schoolId, predictedProb, predictedConf, admitted, beccYear } = body;

    // Validate
    if (
      typeof aggregate !== 'number' || aggregate < 6 || aggregate > 54 ||
      !VALID_COURSES.includes(course) ||
      typeof schoolId !== 'string' || schoolId.length > 128 ||
      typeof predictedProb !== 'number' || predictedProb < 0 || predictedProb > 100 ||
      typeof predictedConf !== 'number' || predictedConf < 0 || predictedConf > 100 ||
      typeof admitted !== 'boolean' ||
      typeof beccYear !== 'number' || beccYear < 2020 || beccYear > 2030
    ) {
      log.warn('calibration.invalid_submission', { schoolId, beccYear });
      return NextResponse.json({ error: 'Invalid submission data' }, { status: 400 });
    }

    const outcome: CalibrationOutcome = {
      aggBucket:     bucketAggregate(aggregate),
      course,
      schoolId,
      predictedProb: Math.round(predictedProb * 10) / 10,
      predictedConf: Math.round(predictedConf),
      admitted,
      beccYear,
      reportedAt: new Date().toISOString(),
    };

    const { rtdb }  = await import('@/lib/firebase');
    const { ref, push } = await import('firebase/database');
    await push(ref(rtdb, 'calibration/outcomes'), outcome);

    log.info('calibration.outcome_stored', { schoolId, admitted, beccYear });
    return NextResponse.json({ success: true });

  } catch (error: any) {
    log.error('calibration.store_error', error);
    return NextResponse.json({ error: 'Failed to store outcome' }, { status: 500 });
  }
}
