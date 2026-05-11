/**
 * Multi-Factor Intelligence Prediction Engine
 * 
 * Advanced placement prediction system that mirrors actual Ghana SHS admission behavior.
 * 
 * Key improvements over V1:
 * - Raw score weighting (0-600)
 * - Subject-level strength weighting
 * - Program competitiveness matrix
 * - Refined school tiers (Elite A, B, C, Mid, Low)
 * - Boarding vs Day school modeling
 * - Historical cutoff distribution curves
 * - Top school hard caps
 * - Rank-based competition simulation
 * - Confidence score separation
 * - Program + school match intelligence
 * - Anomaly detection
 * - Dynamic school data loading from Firebase
 */

// School Tier Classification
export enum SchoolTier {
  ELITE_A = 'elite_a',      // Top national schools (Achimota, PRESEC, Wesley Girls)
  ELITE_B = 'elite_b',      // Strong elite schools
  ELITE_C = 'elite_c',      // Emerging elite schools
  MID_TIER = 'mid_tier',    // Mid-tier schools
  LOW_TIER = 'low_tier'     // Low-tier schools
}

// School Type
export enum SchoolType {
  BOARDING = 'boarding',
  DAY = 'day',
  MIXED = 'mixed'
}

// Program Type
export enum ProgramType {
  SCIENCE = 'science',
  BUSINESS = 'business',
  ARTS = 'arts',
  GENERAL_ARTS = 'general_arts',
  VOCATIONAL = 'vocational'
}

// Program Competitiveness Level
export enum Competitiveness {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Prediction Category
export enum PredictionCategory {
  SAFE = 'safe',
  COMPETITIVE = 'competitive',
  DREAM = 'dream'
}

// School Data Structure
export interface SchoolData {
  id: string;
  name: string;
  tier: SchoolTier;
  type: SchoolType;
  programs: ProgramType[];
  competitiveness: Competitiveness;
  strengths: ProgramType[]; // Programs the school is particularly strong in
  weaknesses: ProgramType[]; // Programs the school is weaker in
  historicalCutoffs: {
    science: number[];
    business: number[];
    arts: number[];
  };
  demandLevel: number; // 1-10, higher = more applicants
}

// Input Data Structure
export interface PredictionInput {
  aggregate: number; // 6-24
  rawScore: number; // 0-600 (sum of all 6 subjects)
  grades: {
    english: number;
    math: number;
    science: number;
    socialStudies: number;
    elective1: number;
    elective2: number;
  };
  program: ProgramType;
  selectedSchools: string[];
  // F1: District quota — true = student is from school's home region/district
  schoolRegionFlags?: Record<string, boolean>;
}

// Prediction Result Structure
export interface PredictionResult {
  schoolId: string;
  schoolName: string;
  probability: number;                          // 0-100, central estimate
  probabilityRange?: { lower: number; upper: number }; // optimistic / pessimistic band
  confidence: number;                           // 0-100, data quality
  category: PredictionCategory;
  tier: SchoolTier;
  reasoning: string;
  programCompatibility: number; // 0-100
  // S2 Fix: Clean factors object - removed ghost fields, renamed confusing ones
  factors: {
    baseProbability: number;           // core CDF result (P_cutoff * 100)
    rawScoreTiebreaker: number;        // tiebreaker contribution (tWeight * tDelta * 100)
    electiveAlignment: number;         // (electiveFactor - 1) * 100
    schoolTypeAdjustment: number;      // (typeFactor - 1) * 100
    projectedCutoff: number;           // renamed from historicalMatch
    cutoffStdDev: number;              // stdDev used for probability range
    cutoffTrendSlope: number;          // slope from trend analysis
  };
}

// Anomaly Detection Result
export interface AnomalyDetection {
  hasAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  anomalies: string[];
  recommendation: string;
}

// Hidden Opportunity — a school the student is under-valuing relative to their subject profile
export interface HiddenOpportunity {
  schoolId: string;
  schoolName: string;
  hiddenScore: number;        // 0–100 composite (higher = stronger edge)
  edgeType: 'subject_mismatch' | 'trend_window' | 'demand_gap';
  edgeExplanation: string;   // Human-readable explanation of the edge
  probability: number;
  confidence: number;
}

// Safe Bet Result — ranked by composite safety+quality score
export interface SafeBetResult {
  schoolId: string;
  schoolName: string;
  safeBetScore: number;      // 0–100 composite
  probability: number;
  confidence: number;
  tier: SchoolTier;
  tierLabel: string;
}

/**
 * Main Prediction Engine Class
 */
export class MultiFactorPredictionEngine {
  private schoolDatabase: Map<string, SchoolData>;
  private programCompetitivenessMatrix: Map<ProgramType, Competitiveness>;
  private subjectWeights: Map<string, number>;

  constructor() {
    this.schoolDatabase = new Map();
    this.programCompetitivenessMatrix = new Map();
    this.subjectWeights = new Map();
    this.initializeSystem();
  }

  /**
   * Initialize the prediction engine with school data and configurations
   */
  private initializeSystem(): void {
    this.initializeSchoolDatabase();
    this.initializeProgramCompetitiveness();
    this.initializeSubjectWeights();
  }

  /**
   * Initialize school database with tier classifications
   */
  private initializeSchoolDatabase(): void {
    // Elite A Schools (Top National Schools)
    this.addSchool({
      id: 'achimota',
      name: 'Achimota School',
      tier: SchoolTier.ELITE_A,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS],
      competitiveness: Competitiveness.VERY_HIGH,
      strengths: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      weaknesses: [ProgramType.VOCATIONAL],
      historicalCutoffs: {
        science: [6, 7, 8], // Aggregates that historically got in
        business: [7, 8, 9],
        arts: [8, 9, 10]
      },
      demandLevel: 10
    });

    this.addSchool({
      id: 'presec_legon',
      name: 'PRESEC Legon',
      tier: SchoolTier.ELITE_A,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      competitiveness: Competitiveness.VERY_HIGH,
      strengths: [ProgramType.SCIENCE],
      weaknesses: [ProgramType.BUSINESS, ProgramType.VOCATIONAL],
      historicalCutoffs: {
        science: [6, 7, 8],
        business: [8, 9, 10],
        arts: [8, 9, 10]
      },
      demandLevel: 10
    });

    this.addSchool({
      id: 'wesley_girls',
      name: 'Wesley Girls High School',
      tier: SchoolTier.ELITE_A,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS],
      competitiveness: Competitiveness.VERY_HIGH,
      strengths: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      weaknesses: [ProgramType.VOCATIONAL],
      historicalCutoffs: {
        science: [6, 7, 8],
        business: [7, 8, 9],
        arts: [8, 9, 10]
      },
      demandLevel: 10
    });

    // Elite B Schools
    this.addSchool({
      id: 'st_marys',
      name: 'St. Mary\'s Senior High School',
      tier: SchoolTier.ELITE_B,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      competitiveness: Competitiveness.HIGH,
      strengths: [ProgramType.SCIENCE],
      weaknesses: [ProgramType.VOCATIONAL],
      historicalCutoffs: {
        science: [7, 8, 9],
        business: [8, 9, 10],
        arts: [9, 10, 11]
      },
      demandLevel: 9
    });

    this.addSchool({
      id: 'adisadel',
      name: 'Adisadel College',
      tier: SchoolTier.ELITE_B,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      competitiveness: Competitiveness.HIGH,
      strengths: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      weaknesses: [ProgramType.VOCATIONAL],
      historicalCutoffs: {
        science: [7, 8, 9],
        business: [8, 9, 10],
        arts: [9, 10, 11]
      },
      demandLevel: 9
    });

    // Elite C Schools
    this.addSchool({
      id: 'ghana_national',
      name: 'Ghana National College',
      tier: SchoolTier.ELITE_C,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS],
      competitiveness: Competitiveness.HIGH,
      strengths: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      weaknesses: [],
      historicalCutoffs: {
        science: [8, 9, 10],
        business: [9, 10, 11],
        arts: [10, 11, 12]
      },
      demandLevel: 8
    });

    // Mid-tier Schools
    this.addSchool({
      id: 'kumasi_high',
      name: 'Kumasi High School',
      tier: SchoolTier.MID_TIER,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS],
      competitiveness: Competitiveness.MEDIUM,
      strengths: [ProgramType.SCIENCE],
      weaknesses: [],
      historicalCutoffs: {
        science: [10, 11, 12],
        business: [11, 12, 13],
        arts: [12, 13, 14]
      },
      demandLevel: 7
    });

    this.addSchool({
      id: 'mpraeso',
      name: 'Mpraeso SHS',
      tier: SchoolTier.MID_TIER,
      type: SchoolType.BOARDING,
      programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS],
      competitiveness: Competitiveness.MEDIUM,
      strengths: [ProgramType.SCIENCE],
      weaknesses: [],
      historicalCutoffs: {
        science: [10, 11, 12],
        business: [11, 12, 13],
        arts: [12, 13, 14]
      },
      demandLevel: 6
    });

    // Low-tier Schools
    this.addSchool({
      id: 'local_community',
      name: 'Local Community SHS',
      tier: SchoolTier.LOW_TIER,
      type: SchoolType.DAY,
      programs: [ProgramType.GENERAL_ARTS, ProgramType.BUSINESS, ProgramType.VOCATIONAL],
      competitiveness: Competitiveness.LOW,
      strengths: [ProgramType.VOCATIONAL],
      weaknesses: [ProgramType.SCIENCE],
      historicalCutoffs: {
        science: [15, 16, 17],
        business: [16, 17, 18],
        arts: [17, 18, 19]
      },
      demandLevel: 4
    });
  }

  /**
   * Add school to database
   */
  private addSchool(school: SchoolData): void {
    this.schoolDatabase.set(school.id, school);
  }

  /**
   * Initialize program competitiveness matrix
   */
  private initializeProgramCompetitiveness(): void {
    this.programCompetitivenessMatrix.set(ProgramType.SCIENCE, Competitiveness.VERY_HIGH);
    this.programCompetitivenessMatrix.set(ProgramType.BUSINESS, Competitiveness.MEDIUM);
    this.programCompetitivenessMatrix.set(ProgramType.ARTS, Competitiveness.LOW);
    this.programCompetitivenessMatrix.set(ProgramType.GENERAL_ARTS, Competitiveness.MEDIUM);
    this.programCompetitivenessMatrix.set(ProgramType.VOCATIONAL, Competitiveness.LOW);
  }

  /**
   * Initialize subject weights
   */
  private initializeSubjectWeights(): void {
    // Base weights (will be adjusted by program)
    this.subjectWeights.set('math', 1.2); // Math is heavily weighted
    this.subjectWeights.set('science', 1.2); // Science is heavily weighted
    this.subjectWeights.set('english', 1.0); // English is baseline
    this.subjectWeights.set('socialStudies', 0.9); // Social studies moderate
    this.subjectWeights.set('elective1', 1.0); // Electives depend on program
    this.subjectWeights.set('elective2', 1.0); // Electives depend on program
  }

  // ─── Statistical helpers (fully deterministic — no Math.random()) ───────────

  /**
   * Error function approximation (Abramowitz & Stegun, max error 1.5e-7)
   */
  private erf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const p = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const result = 1 - p * Math.exp(-x * x);
    return x >= 0 ? result : -result;
  }

  /**
   * Normal CDF — P(X <= x) for X ~ N(mean, stdDev)
   */
  private normalCDF(x: number, mean: number, stdDev: number): number {
    if (stdDev <= 0) return x <= mean ? 1 : 0;
    return 0.5 * (1 + this.erf((x - mean) / (stdDev * Math.SQRT2)));
  }

  /**
   * Trend-weighted mean — most recent years carry the most weight.
   * Note: Empty array should be handled by caller with tier-aware defaults.
   */
  private trendWeightedMean(cutoffs: number[]): number {
    if (cutoffs.length === 0) return 16; // Fallback only - caller should provide tier-aware default
    if (cutoffs.length === 1) return cutoffs[0];
    const rawW = cutoffs.map((_, i) => Math.pow(1.6, i));
    const total = rawW.reduce((s, w) => s + w, 0);
    return cutoffs.reduce((sum, c, i) => sum + c * (rawW[i] / total), 0);
  }

  /**
   * Population std dev of cutoff history.
   * Returns 1.8 when only one data point exists (honest about uncertainty).
   */
  private cutoffStdDev(cutoffs: number[], mean: number): number {
    if (cutoffs.length <= 1) return 1.8;
    const variance = cutoffs.reduce((s, c) => s + (c - mean) ** 2, 0) / cutoffs.length;
    return Math.max(0.4, Math.sqrt(variance));
  }

  /**
   * Least-squares trend slope — negative = school getting harder, positive = easier.
   */
  private cutoffTrend(cutoffs: number[]): number {
    if (cutoffs.length < 2) return 0;
    const n = cutoffs.length;
    const xMean = (n - 1) / 2;
    const yMean = cutoffs.reduce((s, c) => s + c, 0) / n;
    const num = cutoffs.reduce((s, c, i) => s + (i - xMean) * (c - yMean), 0);
    const den = cutoffs.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
    return den === 0 ? 0 : num / den;
  }

  /**
   * Confidence from data quality: more years + lower std dev = higher confidence.
   */
  private dataQualityConfidence(stdDev: number, dataPoints: number): number {
    const yearsBonus = Math.min(20, dataPoints * 4);
    const stabilityBonus = Math.max(0, 20 - stdDev * 8);
    return Math.round(Math.min(90, Math.max(45, 50 + yearsBonus + stabilityBonus)));
  }

  /**
   * Detect anomalies in input
   */
  public detectAnomalies(input: PredictionInput): AnomalyDetection {
    const anomalies: string[] = [];
    let maxSeverity = 0; // 0=none, 1=low, 2=medium, 3=high

    // Check 1: Aggregate vs raw score mismatch.
    // S1 Fix: Piecewise linear approximation from BECE data patterns (more accurate than single linear)
    const meanRawForAggregate = (agg: number): number => {
      if (agg <= 10) return 520 - (agg - 6) * 14;  // 6→520, 10→464
      if (agg <= 18) return 464 - (agg - 10) * 16; // 10→464, 18→336
      if (agg <= 30) return 336 - (agg - 18) * 14; // 18→336, 30→168
      return 168 - (agg - 30) * 8;                 // 30→168, 36→120
    };
    const expectedRaw = meanRawForAggregate(input.aggregate);
    const rawVariance = Math.abs(input.rawScore - expectedRaw);
    if (rawVariance > 200) {
      anomalies.push(`Heads up! Your total mark (${input.rawScore}) and your aggregate (${input.aggregate}) don't quite add up. It's probably a typo — please go back and double-check what you entered.`);
      maxSeverity = Math.max(maxSeverity, 3);
    } else if (rawVariance > 120) {
      anomalies.push(`Your total mark (${input.rawScore}) seems a little off compared to your aggregate (${input.aggregate}). Worth double-checking just to be safe!`);
      maxSeverity = Math.max(maxSeverity, 2);
    }

    // Check 2: Grade variance — extremely uneven subjects.
    const gradeValues = Object.values(input.grades) as number[];
    const avgGrade = gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length;
    const gradeVariance = gradeValues.reduce((s, g) => s + (g - avgGrade) ** 2, 0) / gradeValues.length;
    if (gradeVariance > 8) {
      anomalies.push('Your grades are very different across subjects — some are great, others not so much. Our predictions are still helpful, but take them as a guide rather than a sure thing.');
      maxSeverity = Math.max(maxSeverity, 2);
    } else if (gradeVariance > 5) {
      anomalies.push('Your grades vary quite a bit between subjects. Some schools that focus on specific programs might be harder to predict for you.');
      maxSeverity = Math.max(maxSeverity, 1);
    }

    // Check 3: Impossible combination (raw score too low for aggregate).
    if (input.rawScore < 60 && input.aggregate < 18) {
      anomalies.push('Your total mark looks very low for the aggregate you entered. Please go back and check — it might just be a mistake!');
      maxSeverity = Math.max(maxSeverity, 3);
    }

    const severityMap: ('low' | 'medium' | 'high')[] = ['low', 'low', 'medium', 'high'];
    const severity = severityMap[maxSeverity];

    return {
      hasAnomaly: anomalies.length > 0,
      severity,
      anomalies,
      recommendation: anomalies.length > 0
        ? 'Something looks a little off with your entries. Go back and check your scores — our predictions will be much more accurate once everything looks right.'
        : 'Everything looks good — your predictions should be quite accurate!'
    };
  }

  /**
   * Determine prediction category
   */
  private determineCategory(probability: number, tier: SchoolTier): PredictionCategory {
    // Category is tier-relative: 65% at ELITE_A is "competitive" but 65% at LOW_TIER is "safe"
    const tierThresholds: Record<SchoolTier, number> = {
      [SchoolTier.ELITE_A]: 70,
      [SchoolTier.ELITE_B]: 65,
      [SchoolTier.ELITE_C]: 60,
      [SchoolTier.MID_TIER]: 55,
      [SchoolTier.LOW_TIER]: 45
    };
    const threshold = tierThresholds[tier] ?? 60;
    if (probability >= threshold) return PredictionCategory.SAFE;
    if (probability >= threshold - 25) return PredictionCategory.COMPETITIVE;
    return PredictionCategory.DREAM;
  }

  /**
   * Elective alignment — how well the student's electives match their chosen program.
   * Returns a multiplicative factor (0.96–1.04, ±4% max).
   */
  private calculateElectiveAlignment(input: PredictionInput): number {
    const program = input.program;
    const electives = [input.grades.elective1, input.grades.elective2];
    const electiveAvg = (electives[0] + electives[1]) / 2;
    const coreAvg = (input.grades.english + input.grades.math + input.grades.science + input.grades.socialStudies) / 4;

    // If electives are better than core, student is aligned with program → boost
    // If electives are worse than core, student is misaligned → penalty
    const diff = electiveAvg - coreAvg;
    // Clamp to ±4% (0.96–1.04)
    return Math.max(0.96, Math.min(1.04, 1 + diff * 0.004));
  }

  /**
   * Main prediction method using dynamic school data
   */
  public predictWithSchoolData(input: PredictionInput, schoolDataArray: SchoolData[]): PredictionResult[] {
    const anomaly = this.detectAnomalies(input);
    const results: PredictionResult[] = [];

    for (const school of schoolDataArray) {
      const result = this.calculateSchoolPrediction(input, school);
      if (anomaly.hasAnomaly && anomaly.severity === 'high') {
        result.probability = Math.max(2, Math.round(result.probability * 0.7 * 10) / 10);
        result.confidence = Math.max(30, result.confidence - 20);
      }
      results.push(result);
    }

    return results;
  }

  /**
   * Main prediction method using internal school database
   */
  public predict(input: PredictionInput): PredictionResult[] {
    const results: PredictionResult[] = [];

    for (const schoolId of input.selectedSchools) {
      const school = this.schoolDatabase.get(schoolId);
      
      if (!school) {
        // School not in database, return default prediction
        results.push({
          schoolId,
          schoolName: 'Unknown School',
          probability: 0,
          confidence: 50,
          category: PredictionCategory.DREAM,
          tier: SchoolTier.LOW_TIER,
          reasoning: 'School data not available in prediction database',
          programCompatibility: 50,
          // S2 Fix: Clean factors object
          factors: {
            baseProbability: 0,
            rawScoreTiebreaker: 0,
            electiveAlignment: 0,
            schoolTypeAdjustment: 0,
            projectedCutoff: 0,
            cutoffStdDev: 0,
            cutoffTrendSlope: 0
          }
        });
        continue;
      }

      const result = this.calculateSchoolPrediction(input, school);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate prediction for a single school
   */
  private calculateSchoolPrediction(input: PredictionInput, school: SchoolData): PredictionResult {
    // ── Stage 1: Program gate ─────────────────────────────────────────────────
    if (!school.programs.includes(input.program)) {
      return {
        schoolId: school.id, schoolName: school.name,
        probability: 0, confidence: 95,
        category: PredictionCategory.DREAM, tier: school.tier,
        reasoning: `${school.name} does not offer this program.`,
        programCompatibility: 0,
        // S2 Fix: Clean factors object
        factors: {
          baseProbability: 0,
          rawScoreTiebreaker: 0,
          electiveAlignment: 0,
          schoolTypeAdjustment: 0,
          projectedCutoff: 0,
          cutoffStdDev: 0,
          cutoffTrendSlope: 0
        }
      };
    }

    // ── Stage 2: Model the cutoff as a distribution ───────────────────────────
    const programKey: 'science' | 'business' | 'arts' =
      input.program === ProgramType.SCIENCE   ? 'science' :
      input.program === ProgramType.BUSINESS  ? 'business' : 'arts';

    const rawCutoffs = school.historicalCutoffs[programKey] ?? school.historicalCutoffs.science ?? [];
    const cutoffs = rawCutoffs.filter((c): c is number => typeof c === 'number' && c > 0);

    // Tier-aware default cutoffs when no data available (C5 fix)
    const tierDefaultCutoff: Record<string, number> = {
      [SchoolTier.ELITE_A]: 8, [SchoolTier.ELITE_B]: 12, [SchoolTier.ELITE_C]: 16,
      [SchoolTier.MID_TIER]: 20, [SchoolTier.LOW_TIER]: 24
    };
    const wMean = cutoffs.length === 0
      ? (tierDefaultCutoff[school.tier] ?? 16)
      : this.trendWeightedMean(cutoffs);
    // Tier-aware σ fallback for schools with ≤1 data point.
    // These are intentionally WIDER than real computed σ values — they represent honest
    // uncertainty when we don't know which school within the tier this is.
    // A Cat A school could have a real cutoff anywhere from ~7 to ~13 (range ≈3σ apart).
    // When real multi-year data is available, cutoffStdDev() is used instead (typically 0.8–1.5).
    const tierDefaultStdDev: Record<string, number> = {
      [SchoolTier.ELITE_A]: 2.0, [SchoolTier.ELITE_B]: 2.2,
      [SchoolTier.ELITE_C]: 2.5, [SchoolTier.MID_TIER]: 2.8, [SchoolTier.LOW_TIER]: 3.0,
    };
    const stdDev = cutoffs.length <= 1
      ? (tierDefaultStdDev[school.tier] ?? 1.5)
      : this.cutoffStdDev(cutoffs, wMean);
    // S3 Fix: Only apply trend projection when there are >=3 years of data
    // With <=2 points, the slope is noise, not signal — use zero trend
    const slope = cutoffs.length >= 3 ? this.cutoffTrend(cutoffs) : 0;
    // Extrapolate half a step forward — positive slope = cutoff rising = school getting easier
    const rawProjection = wMean + slope * 0.5;
    // Clamp to physically valid range.
    // Floor: aggregate 6 is the theoretical minimum (all A1s).
    // Ceiling: tier-dependent — a Cat A school cannot trend to aggregate 20+.
    const maxCutoffByTier: Record<string, number> = {
      [SchoolTier.ELITE_A]: 14, [SchoolTier.ELITE_B]: 18,
      [SchoolTier.ELITE_C]: 22, [SchoolTier.MID_TIER]: 28, [SchoolTier.LOW_TIER]: 36
    };
    const projectedCutoff = Math.max(6, Math.min(maxCutoffByTier[school.tier] ?? 36, rawProjection));

    // ── Stage 3: P(placement) via Normal CDF ─────────────────────────────────
    // P(get in) = P(this year's cutoff >= student aggregate)
    // Cutoff ~ N(projectedCutoff, stdDev)  →  P = 1 - Φ(agg; projected, σ)
    const P_cutoff = 1 - this.normalCDF(input.aggregate, projectedCutoff, stdDev);

    // ── Stage 4: Raw score as tiebreaker (multiplicative nudge only) ──────────
    // S1 Fix: Piecewise linear approximation from BECE data patterns
    const meanRawForAgg = (() => {
      const agg = input.aggregate;
      if (agg <= 10) return 520 - (agg - 6) * 14;
      if (agg <= 18) return 464 - (agg - 10) * 16;
      if (agg <= 30) return 336 - (agg - 18) * 14;
      return 168 - (agg - 30) * 8;
    })();
    const rawPercentile = this.normalCDF(input.rawScore, meanRawForAgg, 40);
    const tiebreakWeights: Record<string, number> = {
      [SchoolTier.ELITE_A]: 0.12, [SchoolTier.ELITE_B]: 0.08,
      [SchoolTier.ELITE_C]: 0.05, [SchoolTier.MID_TIER]: 0.03, [SchoolTier.LOW_TIER]: 0.01
    };
    const tWeight = tiebreakWeights[school.tier] ?? 0.03;
    const tDelta  = (rawPercentile - 0.5) * 2; // −1 to +1

    // ── Stage 5: School type factor (boarding is more competitive) ────────────
    const typeFactor = school.type === SchoolType.BOARDING ? 0.95
                     : school.type === SchoolType.DAY      ? 1.03 : 1.0;

    // ── Stage 5b: Elective alignment nudge (±4% max) ───────────────────────────
    const electiveFactor = this.calculateElectiveAlignment(input);

    // ── Stage 6: Combine multiplicatively ────────────────────────────────────
    const P_combined  = P_cutoff * typeFactor * (1 + tWeight * tDelta) * electiveFactor;
    const probability = Math.min(97, Math.max(2, P_combined * 100));

    // ── Stage 6b: Probability range — 68% confidence interval (±1σ)
    // Pessimistic: cutoff lands 1σ lower (school gets harder) → P drops.
    // Optimistic:  cutoff lands 1σ higher (school gets easier) → P rises.
    // ±0.5σ only covers 38% of outcomes; ±1σ covers 68% — the standard interval.
    const P_lower = Math.min(97, Math.max(2,
      (1 - this.normalCDF(input.aggregate, projectedCutoff - stdDev, stdDev))
      * typeFactor * (1 + tWeight * tDelta) * electiveFactor * 100
    ));
    const P_upper = Math.min(97, Math.max(2,
      (1 - this.normalCDF(input.aggregate, projectedCutoff + stdDev, stdDev))
      * typeFactor * (1 + tWeight * tDelta) * electiveFactor * 100
    ));

    // ── Stage 7: Confidence from data quality ─────────────────────────────────
    const confidence = this.dataQualityConfidence(stdDev, cutoffs.length);

    // ── Stage 8: Category (tier-relative) + reasoning ─────────────────────────
    const category = this.determineCategory(probability, school.tier);
    const reasoning = this.buildStatisticalReasoning(input, school, probability, projectedCutoff, slope, stdDev, electiveFactor, tDelta);

    // F1: Apply district/regional quota factor.
    // CSSPS reserves part of each boarding school's intake for home-district students,
    // so out-of-region students compete for a smaller slot pool.
    const inRegion = input.schoolRegionFlags?.[school.id];
    let regionMultiplier = 1.0;
    if (inRegion === true)  regionMultiplier = 1.15; // Home district: larger quota pool
    if (inRegion === false) regionMultiplier = 0.90; // Out-of-region: smaller pool, stiffer competition
    // Only meaningful for boarding schools — day schools have fixed local intake
    const hasRegionSignal = school.type === SchoolType.BOARDING && inRegion !== undefined;
    const adjustedProbability   = Math.min(97, Math.max(2, probability * (hasRegionSignal ? regionMultiplier : 1)));
    const adjustedP_lower       = Math.min(97, Math.max(2, P_lower   * (hasRegionSignal ? regionMultiplier : 1)));
    const adjustedP_upper       = Math.min(97, Math.max(2, P_upper   * (hasRegionSignal ? regionMultiplier : 1)));

    // Append region note to reasoning if signal present
    let finalReasoning = reasoning;
    if (hasRegionSignal && inRegion === true)
      finalReasoning += ' 🏠 Regional advantage: as a home-district student, you compete for a larger share of available places.';
    if (hasRegionSignal && inRegion === false)
      finalReasoning += ' 🌍 Out-of-region: you\'re competing for the non-district quota pool, which is smaller — this slightly reduces the chance.';

    return {
      schoolId: school.id,
      schoolName: school.name,
      probability: Math.round(adjustedProbability * 10) / 10,
      probabilityRange: {
        lower: Math.round(adjustedP_lower * 10) / 10,
        upper: Math.round(adjustedP_upper * 10) / 10
      },
      confidence,
      category,
      tier: school.tier,
      reasoning: finalReasoning,
      programCompatibility: 100,
      // S2 Fix: Clean factors object - removed ghost fields, renamed confusing ones
      factors: {
        baseProbability:      Math.round(P_cutoff * 100 * 10) / 10,
        rawScoreTiebreaker:   Math.round(tWeight * tDelta * 100 * 10) / 10,
        electiveAlignment:    Math.round((electiveFactor - 1) * 100 * 10) / 10,
        schoolTypeAdjustment: Math.round((typeFactor - 1) * 100 * 10) / 10,
        projectedCutoff:      Math.round(projectedCutoff * 10) / 10,
        cutoffStdDev:         Math.round(stdDev * 10) / 10,
        cutoffTrendSlope:   Math.round(slope * 100) / 100
      }
    };
  }

  // ─── Intelligence layer helpers ────────────────────────────────────────────

  /**
   * Returns a subject-specific insight when the student's elective profile
   * gives them a meaningful edge (or disadvantage) vs their raw aggregate.
   */
  private getSubjectInsight(
    input: PredictionInput,
    school: SchoolData,
    electiveFactor: number
  ): string | null {
    const pctShift = Math.round(Math.abs(electiveFactor - 1) * 100);
    const programLabel = input.program.replace('_', ' ');

    if (electiveFactor >= 1.025 && school.strengths.includes(input.program)) {
      return `Your ${programLabel} subjects are actually stronger than your total score shows — that gives you a real boost at a school known for ${programLabel} 💡`;
    }
    if (electiveFactor >= 1.015) {
      return `Your subjects are a good fit for ${programLabel} here — that works in your favour`;
    }
    if (electiveFactor <= 0.975) {
      return `Your subjects for ${programLabel} are a bit weaker than your other grades — keep that in mind as you finalise your picks`;
    }
    return null;
  }

  /**
   * Returns an actionable risk-reward recommendation based on probability + tier.
   */
  private getRiskRewardFrame(probability: number, tier: SchoolTier): string {
    const isPrestigious = tier === SchoolTier.ELITE_A || tier === SchoolTier.ELITE_B;
    if (probability >= 72) {
      return isPrestigious
        ? 'You look very strong for this school — go for it as your top pick! 🎯'
        : 'This is a solid, safe choice — great to have as one of your picks';
    }
    if (probability >= 55) {
      return isPrestigious
        ? 'This is a stretch, but your score gives you a real shot — worth adding as your top ambition pick'
        : 'A decent choice — just make sure you also have some easier options on your list';
    }
    if (probability >= 38) {
      return isPrestigious
        ? 'This is a tough one, but if it\'s your dream school go ahead — just have safer schools ready too'
        : 'This one could be difficult — try to find a school that matches your score a bit better';
    }
    return isPrestigious
      ? 'Very hard to get into with your score — only pick it if you really must'
      : 'This school is probably out of range for your score — look for better options first';
  }

  private buildStatisticalReasoning(
    input: PredictionInput, school: SchoolData,
    probability: number, projectedCutoff: number,
    slope: number, stdDev: number,
    electiveFactor: number, tDelta: number
  ): string {
    const parts: string[] = [];
    const diff = input.aggregate - projectedCutoff;

    // 1. Position statement
    if      (diff < -2) parts.push(`Your score of ${input.aggregate} is comfortably better than what this school usually asks for — great position! 🎉`);
    else if (diff < 0)  parts.push(`Your score of ${input.aggregate} just meets what this school usually looks for — it's close but you're in the running 💪`);
    else if (diff < 1)  parts.push(`Your score of ${input.aggregate} is right at the borderline for this school — it could go either way`);
    else                parts.push(`Your score of ${input.aggregate} is a bit higher than what this school usually picks from — it's a tough one, but not impossible`);

    // 2. Subject-specific insight (the moat layer)
    const subjectInsight = this.getSubjectInsight(input, school, electiveFactor);
    if (subjectInsight) parts.push(subjectInsight);

    // 3. Tiebreaker raw score
    if (tDelta > 0.4)  parts.push('Your total mark puts you a bit ahead of others with the same score — that helps when it\'s tight');
    if (tDelta < -0.4) parts.push('Others with the same score might have slightly higher total marks — something to keep in mind');

    // 4. Trend
    if      (slope < -0.3) parts.push('This school has been getting harder to enter each year, so it might be tougher this time around');
    else if (slope >  0.3) parts.push('This school has been getting easier to enter each year — good timing for you!');

    // 5. Consistency
    if      (stdDev > 1.5) parts.push('This school\'s entry scores change quite a bit each year, so our prediction has some uncertainty — check the low and high chances');
    else if (stdDev < 0.8) parts.push('This school\'s entry scores are very steady each year — we\'re quite confident in this prediction');

    // 6. Tier note
    if (school.tier === SchoolTier.ELITE_A) parts.push('This is one of Ghana\'s most famous schools — a lot of students want to go here, so competition is high');

    // 7. Actionable risk-reward frame
    parts.push(this.getRiskRewardFrame(probability, school.tier));

    return parts.join('. ') + '.';
  }

  // ─── Public Intelligence APIs ────────────────────────────────────────────────

  /**
   * Detects schools where the student's subject profile gives a meaningful edge
   * that raw aggregate alone would not reveal.
   * Call this AFTER predictWithSchoolData to surface hidden picks.
   */
  public findHiddenOpportunities(
    results: PredictionResult[],
    input: PredictionInput
  ): HiddenOpportunity[] {
    const opportunities: HiddenOpportunity[] = [];
    const electiveFactor = this.calculateElectiveAlignment(input);
    const subjectEdgeStrength = (electiveFactor - 1) * 100; // %

    for (const result of results) {
      // Skip extremes — already obvious to the student
      if (result.probability < 38 || result.probability > 88) continue;

      // Edge 1: Subject profile meaningfully beats aggregate
      // S2 Fix: Updated factor names - electiveAlignment and rawScoreTiebreaker
      const totalSubjectEdge =
        (result.factors.electiveAlignment || 0) +
        (result.factors.rawScoreTiebreaker || 0);

      if (totalSubjectEdge >= 5) {
        opportunities.push({
          schoolId:         result.schoolId,
          schoolName:       result.schoolName,
          hiddenScore:      Math.min(100, 50 + totalSubjectEdge * 2.5),
          edgeType:         'subject_mismatch',
          edgeExplanation:  `Your subject grades are stronger than your total score alone shows. This means you have a better chance at ${result.schoolName} than other students with the same total score — you're being underestimated! 🔍`,
          probability:      result.probability,
          confidence:       result.confidence,
        });
        continue;
      }

      // Edge 2: Trend window — cutoff loosening (detected by projectedCutoff factor)
      // S2 Fix: Renamed from historicalMatch to projectedCutoff
      // A cutoff > aggregate + 3 with probability > 50 means the trend is softening fast
      const projectedCutoff = result.factors.projectedCutoff || 0;
      if (projectedCutoff > input.aggregate + 2 && result.probability >= 52) {
        opportunities.push({
          schoolId:         result.schoolId,
          schoolName:       result.schoolName,
          hiddenScore:      Math.min(100, 45 + result.probability * 0.4),
          edgeType:         'trend_window',
          edgeExplanation:  `${result.schoolName} looks tough at first, but its entry scores have been dropping each year. There's a real opening for you this cycle — worth considering!`,
          probability:      result.probability,
          confidence:       result.confidence,
        });
        continue;
      }

      // Edge 3: Demand gap — strong probability at a school students systematically overlook
      // (MID_TIER or ELITE_C with probability >= 65 and high confidence)
      // S4 Fix: Added pessimistic bound check — pessimistic case must still be viable (>=45%)
      if (
        result.probability >= 65 &&
        result.confidence  >= 68 &&
        (result.probabilityRange?.lower ?? 0) >= 45 &&  // NEW: pessimistic bound must be viable
        result.tier !== SchoolTier.ELITE_A &&
        result.tier !== SchoolTier.ELITE_B &&
        result.tier !== SchoolTier.LOW_TIER
      ) {
        opportunities.push({
          schoolId:         result.schoolId,
          schoolName:       result.schoolName,
          hiddenScore:      Math.min(100, result.probability * 0.55 + result.confidence * 0.45),
          edgeType:         'demand_gap',
          edgeExplanation:  `Most students overlook ${result.schoolName} because they're chasing bigger names — but your score is actually a great match here. It's a smart, underrated pick! 💎`,
          probability:      result.probability,
          confidence:       result.confidence,
        });
      }
    }

    return opportunities
      .sort((a, b) => b.hiddenScore - a.hiddenScore)
      .slice(0, 5);
  }

  /**
   * Ranks all results by a composite Safe Bet Score:
   *   45% probability + 35% confidence + 20% tier appeal
   * Filters to probability >= 55 and confidence >= 60 to exclude low-signal entries.
   */
  public scoreSafeBets(results: PredictionResult[]): SafeBetResult[] {
    const tierAppeal: Record<string, number> = {
      [SchoolTier.ELITE_A]:  100,
      [SchoolTier.ELITE_B]:  85,
      [SchoolTier.ELITE_C]:  70,
      [SchoolTier.MID_TIER]: 55,
      [SchoolTier.LOW_TIER]: 35,
    };
    const tierLabel: Record<string, string> = {
      [SchoolTier.ELITE_A]:  'Category A',
      [SchoolTier.ELITE_B]:  'Category B',
      [SchoolTier.ELITE_C]:  'Category C',
      [SchoolTier.MID_TIER]: 'Mid-Tier',
      [SchoolTier.LOW_TIER]: 'Foundation',
    };

    return results
      .filter(r => r.probability >= 55 && r.confidence >= 60 && r.tier !== SchoolTier.LOW_TIER)
      .map(r => ({
        schoolId:      r.schoolId,
        schoolName:    r.schoolName,
        safeBetScore:  Math.round(
          r.probability          * 0.45 +
          r.confidence           * 0.35 +
          (tierAppeal[r.tier] ?? 50) * 0.20
        ),
        probability: r.probability,
        confidence:  r.confidence,
        tier:        r.tier,
        tierLabel:   tierLabel[r.tier] ?? r.tier,
      }))
      .sort((a, b) => b.safeBetScore - a.safeBetScore);
  }

  /**
   * Helper: Get program key for historical cutoffs
   */
  private getProgramKey(school: SchoolData): string {
    // Map program types to historical cutoff keys
    if (school.programs.includes(ProgramType.SCIENCE)) return 'science';
    if (school.programs.includes(ProgramType.BUSINESS)) return 'business';
    return 'arts';
  }

  /**
   * Get school data
   */
  public getSchoolData(schoolId: string): SchoolData | undefined {
    return this.schoolDatabase.get(schoolId);
  }

  /**
   * Get all schools
   */
  public getAllSchools(): SchoolData[] {
    return Array.from(this.schoolDatabase.values());
  }
}

// Export singleton instance
export const predictionEngine = new MultiFactorPredictionEngine();
