import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/validate-sigma
 *
 * Reads all schools from Firebase, finds those with ≥3 years of cutoff data,
 * computes the actual population σ for each, and returns:
 *   - Mean σ per tier (use these to recalibrate tierDefaultStdDev in predictionEngine.ts)
 *   - Mean σ per category (A–E)
 *   - Per-program offset deltas (Science → Business, Science → Arts) per category
 *   - Raw list of all computed σ values so you can inspect outliers
 *
 * Run this ONCE against your real Firebase data before launch to validate or
 * replace the hardcoded σ defaults in predictionEngine.ts.
 */
export async function GET() {
  try {
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const schoolsRef = ref(rtdb, 'schools');
    const snapshot = await get(schoolsRef);

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'No schools found in Firebase' }, { status: 404 });
    }

    const allSchools = snapshot.val() as Record<string, any>;

    // ── Collect schools with enough cutoff data ────────────────────────────────
    const sigmaByCategory: Record<string, number[]> = { A: [], B: [], C: [], D: [], E: [] };
    const offsetBusiness: Record<string, number[]> = { A: [], B: [], C: [], D: [], E: [] };
    const offsetArts:     Record<string, number[]> = { A: [], B: [], C: [], D: [], E: [] };
    const rawRows: { id: string; name: string; category: string; sigma: number; years: number }[] = [];

    for (const [id, school] of Object.entries(allSchools)) {
      const cat: string = school.category ?? '?';

      // Helper: extract year-keyed numeric values in chronological order
      const extractYearSeries = (obj: any): number[] => {
        if (!obj || typeof obj !== 'object') return [];
        const yearKeys = Object.keys(obj).filter(k => /^\d{4}$/.test(k)).sort();
        return yearKeys.map(k => obj[k]).filter((v): v is number => typeof v === 'number');
      };

      // Helper: extract a named program array or fall back to year-keyed series
      const getProgramCutoffs = (programKey: string): number[] => {
        if (Array.isArray(school.historicalCutoffs?.[programKey])) {
          return school.historicalCutoffs[programKey] as number[];
        }
        return extractYearSeries(school.historicalCutoffs);
      };

      // Helper: population std dev
      const stdDev = (values: number[]): number => {
        if (values.length < 2) return -1;
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        return Math.sqrt(variance);
      };

      const sciCutoffs = getProgramCutoffs('science');
      const sigma = stdDev(sciCutoffs);

      if (sciCutoffs.length >= 3 && sigma >= 0 && sigmaByCategory[cat]) {
        sigmaByCategory[cat].push(sigma);
        rawRows.push({ id, name: school.name ?? id, category: cat, sigma: Math.round(sigma * 100) / 100, years: sciCutoffs.length });
      }

      // Per-program offset deltas (only if all three arrays exist with ≥2 points each)
      const busCutoffs = getProgramCutoffs('business');
      const artsCutoffs = getProgramCutoffs('arts');

      const sciMean = sciCutoffs.length >= 2 ? sciCutoffs.reduce((s, v) => s + v, 0) / sciCutoffs.length : null;
      const busMean = busCutoffs.length >= 2 ? busCutoffs.reduce((s, v) => s + v, 0) / busCutoffs.length : null;
      const artsMean = artsCutoffs.length >= 2 ? artsCutoffs.reduce((s, v) => s + v, 0) / artsCutoffs.length : null;

      if (sciMean !== null && busMean !== null && offsetBusiness[cat]) {
        offsetBusiness[cat].push(busMean - sciMean);
      }
      if (sciMean !== null && artsMean !== null && offsetArts[cat]) {
        offsetArts[cat].push(artsMean - sciMean);
      }
    }

    // ── Aggregate results ──────────────────────────────────────────────────────
    const mean = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;

    const sigmaSummary: Record<string, any> = {};
    for (const cat of ['A', 'B', 'C', 'D', 'E']) {
      sigmaSummary[cat] = {
        meanSigma:       mean(sigmaByCategory[cat]),
        schoolsWithData: sigmaByCategory[cat].length,
        meanBusinessOffset: mean(offsetBusiness[cat]),
        meanArtsOffset:     mean(offsetArts[cat]),
        schoolsWithOffsets: offsetBusiness[cat].length,
      };
    }

    // ── Current hardcoded defaults for comparison ─────────────────────────────
    const currentDefaults = {
      tierSigmaDefaults: { ELITE_A: 0.8, ELITE_B: 1.0, ELITE_C: 1.2, MID_TIER: 1.5, LOW_TIER: 2.0 },
      programOffsets: {
        note: 'Elite A/B: business+1, arts+2 | Elite C: business+0.8, arts+1.5 | D/E: business+0.5, arts+1'
      }
    };

    return NextResponse.json({
      summary: sigmaSummary,
      currentDefaults,
      rawSchools: rawRows.sort((a, b) => a.category.localeCompare(b.category) || b.sigma - a.sigma),
      instructions: [
        'Compare summary[category].meanSigma to currentDefaults.tierSigmaDefaults.',
        'If real mean σ for Cat A is >0.8, update ELITE_A default in predictionEngine.ts cutoffStdDev.',
        'Check meanBusinessOffset and meanArtsOffset per category — if they differ from +1/+2, update buildCutoffs in /api/predict/route.ts.',
        'Schools listed under rawSchools with sigma>2.0 are high-uncertainty outliers worth inspecting.'
      ]
    });
  } catch (error: any) {
    console.error('Sigma validation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
