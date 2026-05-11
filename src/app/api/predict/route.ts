import { NextResponse } from 'next/server';
import { predictionEngine, PredictionInput, ProgramType, SchoolData, SchoolTier, SchoolType, Competitiveness } from '@/lib/predictionEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { aggregate, rawScore, grades, schools, course } = body;

    console.log('Prediction request received:', { aggregate, rawScore, course, schoolCount: schools?.length });

    if (!aggregate || !rawScore || !grades || !schools || !Array.isArray(schools)) {
      console.error('Invalid request data:', { aggregate, rawScore, hasGrades: !!grades, hasSchools: !!schools });
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Map course to program type
    const programTypeMap: Record<string, ProgramType> = {
      'General Science': ProgramType.SCIENCE,
      'General Arts': ProgramType.GENERAL_ARTS,
      'Business': ProgramType.BUSINESS,
      'Agriculture': ProgramType.SCIENCE,
      'Visual Arts': ProgramType.ARTS
    };

    const programType = programTypeMap[course] || ProgramType.GENERAL_ARTS;
    console.log('Program type mapped:', programType);

    // Dynamically import Firebase
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    // Fetch school data from Firebase for all selected schools
    const schoolDataPromises = schools.map(async (school: any) => {
      try {
        const schoolRef = ref(rtdb, `schools/${school.id}`);
        const snapshot = await get(schoolRef);
        
        if (snapshot.exists()) {
          const firebaseSchool = snapshot.val();
          
          // Map Firebase school category to tier
          const tierMap: Record<string, SchoolTier> = {
            'A': SchoolTier.ELITE_A,
            'B': SchoolTier.ELITE_B,
            'C': SchoolTier.ELITE_C,
            'D': SchoolTier.MID_TIER,
            'E': SchoolTier.LOW_TIER
          };
          
          const tier = tierMap[firebaseSchool.category] || SchoolTier.MID_TIER;
          
          // Determine school type based on Firebase data or default
          const type = firebaseSchool.type === 'day' ? SchoolType.DAY : 
                       firebaseSchool.type === 'boarding' ? SchoolType.BOARDING : 
                       SchoolType.MIXED;
          
          // Map category to competitiveness
          const competitivenessMap: Record<string, Competitiveness> = {
            'A': Competitiveness.VERY_HIGH,
            'B': Competitiveness.HIGH,
            'C': Competitiveness.MEDIUM,
            'D': Competitiveness.MEDIUM,
            'E': Competitiveness.LOW
          };
          
          const competitiveness = competitivenessMap[firebaseSchool.category] || Competitiveness.MEDIUM;
          
          // Build per-program cutoff arrays.
          // Priority: explicit arrays in Firebase > year-keyed values > category defaults.
          // programKey is the Firebase field to look up; numericOffset is the aggregate delta to apply.
          const buildCutoffs = (programKey: 'science' | 'business' | 'arts', numericOffset: number): number[] => {
            // 1. Explicit per-program array in Firebase — use as-is, no offset needed
            if (Array.isArray(firebaseSchool.historicalCutoffs?.[programKey])) {
              return firebaseSchool.historicalCutoffs[programKey];
            }
            // 2. Year-keyed values (e.g. { '2021': 7, '2022': 8, '2023': 7 }) + program offset
            if (firebaseSchool.historicalCutoffs && typeof firebaseSchool.historicalCutoffs === 'object') {
              const yearKeys = Object.keys(firebaseSchool.historicalCutoffs)
                .filter(k => /^\d{4}$/.test(k))
                .sort();
              if (yearKeys.length > 0) {
                return yearKeys.map(y => (firebaseSchool.historicalCutoffs[y] as number) + numericOffset);
              }
            }
            // 3. Category-based defaults (science baseline), calibrated from real Ghana SHS data.
            //    Gaps: Science=+0 | Business=tier-dependent | Arts=tier-dependent (see below).
            const categoryDefaults: Record<string, number> = { A: 8, B: 12, C: 16, D: 20, E: 24 };
            const base = (categoryDefaults[firebaseSchool.category] ?? 16) + numericOffset;
            return [base]; // single point → engine uses tier-aware σ default (wider, honest)
          };

          // Tier-dependent program offsets.
          // At Cat A/B schools: strong demand differentiation by program — gap is sharp (+1/+2).
          // At Cat C schools:   moderate differentiation — gap compresses slightly.
          // At Cat D/E schools: supply is less constrained — gap is small (≈+0.5/+1).
          const isElite = tier === SchoolTier.ELITE_A || tier === SchoolTier.ELITE_B;
          const businessOffset = isElite ? 1   : tier === SchoolTier.ELITE_C ? 0.8 : 0.5;
          const artsOffset     = isElite ? 2   : tier === SchoolTier.ELITE_C ? 1.5 : 1;

          // Course-specific accessibility adjustments.
          // Agriculture → mapped to ProgramType.SCIENCE, but is ~1.5 agg points more accessible.
          // Visual Arts  → mapped to ProgramType.ARTS,    but is ~1   agg point  more accessible.
          // These offsets are applied only to the cutoff array the engine will actually read.
          const courseAdj: Partial<Record<'science' | 'business' | 'arts', number>> =
            course === 'Agriculture' ? { science:  1.5 } :
            course === 'Visual Arts' ? { arts:     1.0 } : {};

          // Create SchoolData object
          const schoolData: SchoolData = {
            id: school.id,
            name: school.name,
            tier,
            type,
            programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS, ProgramType.ARTS],
            competitiveness,
            strengths: firebaseSchool.programStrengths || [],
            weaknesses: firebaseSchool.programWeaknesses || [],
            historicalCutoffs: {
              science:  buildCutoffs('science',  0              + (courseAdj.science  ?? 0)),
              business: buildCutoffs('business', businessOffset + (courseAdj.business ?? 0)),
              arts:     buildCutoffs('arts',     artsOffset     + (courseAdj.arts     ?? 0))
            },
            demandLevel: tier === SchoolTier.ELITE_A ? 10 : 
                         tier === SchoolTier.ELITE_B ? 8 :
                         tier === SchoolTier.ELITE_C ? 6 :
                         tier === SchoolTier.MID_TIER ? 4 : 2
          };
          
          return schoolData;
        }
      } catch (error) {
        console.error('Error fetching school data for:', school.id, error);
      }
      
      // Fallback for schools not in Firebase or on error.
      // Category D defaults with honest uncertainty (small spread, not a uniform range).
      return {
        id: school.id,
        name: school.name,
        tier: SchoolTier.MID_TIER,
        type: SchoolType.MIXED,
        programs: [ProgramType.SCIENCE, ProgramType.GENERAL_ARTS, ProgramType.BUSINESS, ProgramType.ARTS],
        competitiveness: Competitiveness.MEDIUM,
        strengths: [],
        weaknesses: [],
        historicalCutoffs: {
          science:  [23, 22, 22, 21],
          business: [25, 24, 24, 23],
          arts:     [26, 25, 25, 24]
        },
        demandLevel: 4
      };
    });

    const schoolDataArray = await Promise.all(schoolDataPromises);
    console.log('School data fetched:', schoolDataArray.length);

    // Prepare input for prediction engine
    const predictionInput: PredictionInput = {
      aggregate,
      rawScore,
      grades: {
        english: grades.english || 0,
        math: grades.math || 0,
        science: grades.science || 0,
        socialStudies: grades.social || 0,
        elective1: grades.el1 || 0,
        elective2: grades.el2 || 0
      },
      program: programType,
      selectedSchools: schools.map((s: any) => s.id)
    };

    console.log('Prediction input prepared:', predictionInput);

    // Run anomaly detection
    const anomalyDetection = predictionEngine.detectAnomalies(predictionInput);
    console.log('Anomaly detection complete');

    // Get predictions from new engine with dynamic school data
    const predictions = predictionEngine.predictWithSchoolData(predictionInput, schoolDataArray);
    console.log('Predictions generated:', predictions.length);

    // Map predictions to selected schools
    const results = schools.map((school: any, index: number) => {
      const prediction = predictions.find(p => p.schoolId === school.id);
      
      if (!prediction) {
        return {
          schoolId: school.id,
          schoolName: school.name,
          probability: 0,
          confidence: 50,
          category: 'dream',
          tier: 'unknown',
          reasoning: 'School not found in prediction database',
          programCompatibility: 0,
          factors: {}
        };
      }

      return {
        schoolId: school.id,
        schoolName: school.name,
        probability: prediction.probability,
        probabilityRange: prediction.probabilityRange,
        confidence: prediction.confidence,
        category: prediction.category,
        tier: prediction.tier,
        reasoning: prediction.reasoning,
        programCompatibility: prediction.programCompatibility,
        factors: prediction.factors,
        locked: index >= 5,
      };
    });

    // Keep results in same order the user chose their schools (1st choice first)

    console.log('Results prepared:', results.length);

    // Intelligence layer: Safe Bet ranking + Hidden Opportunity detection
    const safeBets         = predictionEngine.scoreSafeBets(predictions);
    const hiddenOpportunities = predictionEngine.findHiddenOpportunities(predictions, predictionInput);

    // Annotate results with safe-bet score and high-risk flag for UI
    const annotatedResults = results.map(r => {
      const sb = safeBets.find(s => s.schoolId === r.schoolId);
      return {
        ...r,
        safeBetScore: sb?.safeBetScore ?? null,
        safeBet:      (sb?.safeBetScore ?? 0) >= 70,
        highRisk:     (r.probability ?? 0) < 30,
      };
    });

    // Data manifest for UI provenance note
    const { DATA_MANIFEST } = await import('@/lib/dataManifest');

    return NextResponse.json({
      results:            annotatedResults,
      safeBets:           safeBets.slice(0, 5),
      hiddenOpportunities,
      anomalyDetection:   anomalyDetection.hasAnomaly ? anomalyDetection : null,
      dataManifest: {
        version:     DATA_MANIFEST.version,
        lastUpdated: DATA_MANIFEST.lastUpdated,
        nextUpdate:  DATA_MANIFEST.nextUpdate,
        sourceNote:  DATA_MANIFEST.sourceNote,
      },
    });
  } catch (error: any) {
    console.error('Prediction API error:', error);
    return NextResponse.json({ error: error.message || 'Prediction request failed' }, { status: 500 });
  }
}
