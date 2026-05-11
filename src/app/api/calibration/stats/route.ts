/**
 * GET /api/calibration/stats
 * Admin-protected endpoint that computes Brier scores and calibration metrics
 * from stored outcome records.
 *
 * Requires: x-admin-secret header matching ADMIN_SECRET env var.
 *
 * Brier score: mean((predicted_prob/100 - actual_outcome)²)
 *   - Perfect: 0.0  |  Coin flip: 0.25  |  Worst: 1.0
 *   - A well-calibrated model at ~60% average probability should score ≤ 0.18
 *
 * Returns:
 *   - Overall Brier score
 *   - Per-school Brier scores (identifies worst-performing schools)
 *   - Per-aggregate-bucket calibration (identifies which ranges are biased)
 *   - Per-course calibration
 *   - Calibration table: predicted band → actual admission rate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/requestLogger';

export const dynamic = 'force-dynamic';

interface OutcomeRecord {
  aggBucket:     string;
  course:        string;
  schoolId:      string;
  predictedProb: number;   // 0–100
  predictedConf: number;
  admitted:      boolean;
  beccYear:      number;
  reportedAt:    string;
}

function brierScore(outcomes: OutcomeRecord[]): number {
  if (outcomes.length === 0) return 0;
  const sum = outcomes.reduce((acc, o) => {
    const p = o.predictedProb / 100;
    const y = o.admitted ? 1 : 0;
    return acc + Math.pow(p - y, 2);
  }, 0);
  return Math.round((sum / outcomes.length) * 10000) / 10000;
}

/** Group outcomes by a key and compute Brier score for each group. */
function brierByKey(
  outcomes: OutcomeRecord[],
  keyFn: (o: OutcomeRecord) => string
): Record<string, { brierScore: number; n: number; admitRate: number }> {
  const groups: Record<string, OutcomeRecord[]> = {};
  for (const o of outcomes) {
    const k = keyFn(o);
    (groups[k] ||= []).push(o);
  }
  const result: Record<string, { brierScore: number; n: number; admitRate: number }> = {};
  for (const [k, group] of Object.entries(groups)) {
    result[k] = {
      brierScore: brierScore(group),
      n:          group.length,
      admitRate:  Math.round((group.filter(o => o.admitted).length / group.length) * 1000) / 10,
    };
  }
  return result;
}

/**
 * Calibration table: bucket predictions into 10-point bands and compare
 * predicted probability to actual admission rate.
 * A perfectly calibrated model produces a diagonal (50% predicted = 50% actual).
 */
function calibrationTable(
  outcomes: OutcomeRecord[]
): Array<{ band: string; predictedMid: number; actualRate: number; n: number }> {
  const bands: Record<string, OutcomeRecord[]> = {};
  for (const o of outcomes) {
    const band = `${Math.floor(o.predictedProb / 10) * 10}-${Math.floor(o.predictedProb / 10) * 10 + 9}`;
    (bands[band] ||= []).push(o);
  }
  return Object.entries(bands)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([band, group]) => ({
      band,
      predictedMid: parseInt(band) + 5,
      actualRate:   Math.round((group.filter(o => o.admitted).length / group.length) * 1000) / 10,
      n:            group.length,
    }));
}

export async function GET(request: NextRequest) {
  const log = createLogger(request);

  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    log.warn('calibration.stats_unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const snap = await get(ref(rtdb, 'calibration/outcomes'));
    if (!snap.exists()) {
      return NextResponse.json({
        message: 'No calibration data yet. Outcomes are submitted by students post-placement.',
        totalRecords: 0,
      });
    }

    const outcomes: OutcomeRecord[] = Object.values(snap.val() as Record<string, OutcomeRecord>);
    const total = outcomes.length;

    const overall         = brierScore(outcomes);
    const bySchool        = brierByKey(outcomes, o => o.schoolId);
    const byAggBucket     = brierByKey(outcomes, o => o.aggBucket);
    const byCourse        = brierByKey(outcomes, o => o.course);
    const byYear          = brierByKey(outcomes, o => String(o.beccYear));
    const calibration     = calibrationTable(outcomes);
    const overallAdmitRate = Math.round((outcomes.filter(o => o.admitted).length / total) * 1000) / 10;

    // Flag worst-performing schools (Brier score > 0.22 with n ≥ 10)
    const poorlyCalibrated = Object.entries(bySchool)
      .filter(([, v]) => v.brierScore > 0.22 && v.n >= 10)
      .sort(([, a], [, b]) => b.brierScore - a.brierScore)
      .slice(0, 10)
      .map(([schoolId, stats]) => ({ schoolId, ...stats }));

    log.info('calibration.stats_computed', { total, overallBrier: overall });

    return NextResponse.json({
      totalRecords:       total,
      overallBrierScore:  overall,
      overallAdmitRate,
      interpretation: overall <= 0.12 ? 'Well calibrated'
                    : overall <= 0.20 ? 'Acceptable — monitor closely'
                    : 'Overconfident — recalibration recommended',
      calibrationTable:   calibration,
      byAggBucket,
      byCourse,
      byYear,
      poorlyCalibrated,
      note: 'Brier score: 0.0 = perfect, 0.25 = random, 1.0 = perfectly wrong',
    });

  } catch (error: any) {
    log.error('calibration.stats_error', error);
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
  }
}
