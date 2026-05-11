/**
 * schoolBuilder.ts
 * Shared utility: converts raw Firebase school data → SchoolData for the prediction engine.
 * Single source of truth used by both /api/predict and /api/schools/suggest.
 */

import {
  SchoolData,
  ProgramType,
  SchoolTier,
  SchoolType,
  Competitiveness,
} from '@/lib/predictionEngine';

const TIER_MAP: Record<string, SchoolTier> = {
  A: SchoolTier.ELITE_A,
  B: SchoolTier.ELITE_B,
  C: SchoolTier.ELITE_C,
  D: SchoolTier.MID_TIER,
  E: SchoolTier.LOW_TIER,
};

const COMPETITIVENESS_MAP: Record<string, Competitiveness> = {
  A: Competitiveness.VERY_HIGH,
  B: Competitiveness.HIGH,
  C: Competitiveness.MEDIUM,
  D: Competitiveness.MEDIUM,
  E: Competitiveness.LOW,
};

// Category-based science cutoff defaults (calibrated from Ghana SHS data).
// These are used when a school has no explicit historicalCutoffs in Firebase.
const CATEGORY_DEFAULTS: Record<string, number> = { A: 8, B: 12, C: 16, D: 20, E: 24 };

/**
 * Build a SchoolData object from raw Firebase school data.
 *
 * @param schoolId   Firebase key (string)
 * @param schoolName Display name (string)
 * @param fs         Raw Firebase school document
 * @param course     Student's chosen BECE course (affects cutoff accessibility)
 */
export function buildSchoolData(
  schoolId: string,
  schoolName: string,
  fs: any,
  course: string,
): SchoolData {
  const tier          = TIER_MAP[fs.category]          || SchoolTier.MID_TIER;
  const type          = fs.type === 'day'     ? SchoolType.DAY
                      : fs.type === 'boarding' ? SchoolType.BOARDING
                      : SchoolType.MIXED;
  const competitiveness = COMPETITIVENESS_MAP[fs.category] || Competitiveness.MEDIUM;

  // Tier-dependent program offsets.
  // Rationale: Cat A/B schools have high demand differentiation between programs;
  // Cat D/E schools have looser supply constraints so program gaps compress.
  const isElite        = tier === SchoolTier.ELITE_A || tier === SchoolTier.ELITE_B;
  const businessOffset = isElite ? 1 : tier === SchoolTier.ELITE_C ? 0.8 : 0.5;
  const artsOffset     = isElite ? 2 : tier === SchoolTier.ELITE_C ? 1.5 : 1;

  // Course-specific accessibility adjustments (POSITIVE = more accessible = higher cutoff).
  // Agriculture is mapped to SCIENCE but ~1.5 agg points easier than pure science.
  // Visual Arts  is mapped to ARTS   but ~1.0 agg point  easier than general arts.
  // A higher cutoff means more students qualify → correctly models the accessibility gap.
  const courseAdj: Partial<Record<'science' | 'business' | 'arts', number>> =
    course === 'Agriculture' ? { science: 1.5 } :
    course === 'Visual Arts'  ? { arts:   1.0 } : {};

  /**
   * Build historical cutoffs array for a given program slot.
   * Priority order:
   *   1. Explicit per-program array in Firebase (e.g. historicalCutoffs.science: [7,8,7])
   *   2. Year-keyed flat values (e.g. { '2021': 7, '2022': 8 }) + program offset
   *   3. Category default + program offset
   */
  const buildCutoffs = (key: 'science' | 'business' | 'arts', offset: number): number[] => {
    // 1. Explicit per-program array
    if (Array.isArray(fs.historicalCutoffs?.[key])) {
      return fs.historicalCutoffs[key] as number[];
    }
    // 2. Year-keyed flat values
    if (fs.historicalCutoffs && typeof fs.historicalCutoffs === 'object') {
      const yearKeys = Object.keys(fs.historicalCutoffs)
        .filter(k => /^\d{4}$/.test(k))
        .sort();
      if (yearKeys.length > 0) {
        return yearKeys.map(y => (fs.historicalCutoffs[y] as number) + offset);
      }
    }
    // 3. Category default
    const base = (CATEGORY_DEFAULTS[fs.category] ?? 16) + offset;
    return [base];
  };

  return {
    id:   schoolId,
    name: schoolName || schoolId,
    tier,
    type,
    programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS, ProgramType.ARTS],
    competitiveness,
    strengths:  fs.programStrengths  || [],
    weaknesses: fs.programWeaknesses || [],
    historicalCutoffs: {
      science:  buildCutoffs('science',  0              + (courseAdj.science  ?? 0)),
      business: buildCutoffs('business', businessOffset + (courseAdj.business ?? 0)),
      arts:     buildCutoffs('arts',     artsOffset     + (courseAdj.arts     ?? 0)),
    },
    demandLevel:
      tier === SchoolTier.ELITE_A ? 10 :
      tier === SchoolTier.ELITE_B ? 8  :
      tier === SchoolTier.ELITE_C ? 6  :
      tier === SchoolTier.MID_TIER ? 4 : 2,
  };
}

/** Fallback SchoolData used when Firebase lookup fails for a specific school. */
export function buildFallbackSchoolData(schoolId: string, schoolName: string): SchoolData {
  return {
    id:   schoolId,
    name: schoolName || schoolId,
    tier: SchoolTier.MID_TIER,
    type: SchoolType.MIXED,
    programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS, ProgramType.ARTS],
    competitiveness: Competitiveness.MEDIUM,
    strengths:  [],
    weaknesses: [],
    historicalCutoffs: {
      science:  [23, 22, 22, 21],
      business: [24, 23, 23, 22],
      arts:     [25, 24, 24, 23],
    },
    demandLevel: 4,
  };
}
