import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine, PredictionInput, ProgramType } from '@/lib/predictionEngine';
import { schoolCache } from '@/lib/schoolCache';
import { buildSchoolData, buildFallbackSchoolData } from '@/lib/schoolBuilder';
import { validatePredictInput } from '@/lib/inputValidation';
import { logPredictionEvent, buildPredictionEvent } from '@/lib/telemetry';
import { createLogger } from '@/lib/requestLogger';

export const dynamic = 'force-dynamic';

// F6: Simple in-process sliding window rate limiter (10 req / 60s per IP)
// Upgrade to @upstash/ratelimit + @upstash/redis for multi-instance production use
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// O(1) entitlement check — reads a single Firebase path instead of scanning all payments.
// Relies on createEntitlement() writing to users/{userId}/entitlements/{featureType}.
async function checkPremiumEntitlement(userId: string): Promise<boolean> {
  try {
    const normalizedId = userId.toLowerCase().trim();
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');
    // Single O(1) path read — scales to any number of users
    const snap = await get(ref(rtdb, `users/${normalizedId}/entitlements/premium_report`));
    return snap.exists() ? Boolean(snap.val()) : false;
  } catch {
    return false;
  }
}

// Strip premium fields from results for free users
function stripPremiumFields(result: any): any {
  return {
    schoolId: result.schoolId,
    schoolName: result.schoolName,
    probability: result.probability,
    confidence: result.confidence,
    category: result.category,
    tier: result.tier,
    programCompatibility: result.programCompatibility,
    locked: result.locked,
    safeBet: result.safeBet,
    highRisk: result.highRisk,
    // Strip detailed fields
    probabilityRange: undefined,
    reasoning: undefined,
    factors: undefined,
    safeBetScore: undefined,
  };
}

export async function POST(request: NextRequest) {
  // F6: Rate limit — 10 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const log = createLogger(request);
  const startMs = Date.now();

  try {
    const body = await request.json();
    const { aggregate, rawScore, grades, schools, course, userId, schoolRegionFlags } = body;

    // Validate and sanitize inputs
    const validation = validatePredictInput(body);
    if (!validation.valid) {
      log.warn('predict.validation_fail', { error: validation.error });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    log.info('predict.start', { course, schoolCount: schools?.length, hasUserId: !!userId });

    // O(1) entitlement check using users/{userId}/entitlements node
    const hasPremium = userId ? await checkPremiumEntitlement(userId) : false;

    const programTypeMap: Record<string, ProgramType> = {
      'General Science': ProgramType.SCIENCE,
      'General Arts':    ProgramType.GENERAL_ARTS,
      'Business':        ProgramType.BUSINESS,
      'Agriculture':     ProgramType.SCIENCE,
      'Visual Arts':     ProgramType.ARTS,
    };
    const programType = programTypeMap[course] || ProgramType.GENERAL_ARTS;

    // Fetch school data — check cache first, only hit Firebase on miss
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const fbStart = Date.now();
    let cacheHits = 0;
    const schoolDataArray = await Promise.all(
      schools.map(async (school: any) => {
        // Cache hit
        const cached = schoolCache.getById(school.id);
        if (cached) { cacheHits++; return buildSchoolData(school.id, school.name, cached, course); }
        // Cache miss — fetch from Firebase
        try {
          const snap = await get(ref(rtdb, `schools/${school.id}`));
          if (snap.exists()) {
            const fs = snap.val();
            schoolCache.setById(school.id, fs);
            return buildSchoolData(school.id, school.name, fs, course);
          }
        } catch (err) {
          log.error('predict.firebase_miss', err, { schoolId: school.id });
        }
        return buildFallbackSchoolData(school.id, school.name);
      })
    );
    log.info('predict.schools_loaded', { total: schools.length, cacheHits, fbMs: Date.now() - fbStart });

    // Prepare input for prediction engine
    const predictionInput: PredictionInput = {
      aggregate,
      rawScore,
      grades: {
        english:       grades.english || 0,
        math:          grades.math    || 0,
        science:       grades.science || 0,
        socialStudies: grades.social  || 0,
        elective1:     grades.el1     || 0,
        elective2:     grades.el2     || 0,
      },
      program:        programType,
      selectedSchools: schools.map((s: any) => s.id),
      schoolRegionFlags: schoolRegionFlags ?? {},
    };

    // Run anomaly detection
    const anomalyDetection = predictionEngine.detectAnomalies(predictionInput);
    const predictions = predictionEngine.predictWithSchoolData(predictionInput, schoolDataArray);

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
    const annotatedResults = results.map((r: any) => {
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

    // Apply server-side premium gating (C2 fix)
    let responseResults = annotatedResults;
    let responseSafeBets = safeBets.slice(0, 5);
    let responseHiddenOpportunities = hiddenOpportunities;
    
    if (!hasPremium) {
      // Free users: only first 5 schools, stripped fields
      responseResults = annotatedResults.slice(0, 5).map((r: any, index: number) => ({
        ...stripPremiumFields(r),
        locked: index >= 5, // All free results show as locked after index 4
      }));
      // Strip premium intelligence for free users
      responseSafeBets = []; // Empty array - free users don't get safe bet list
      responseHiddenOpportunities = []; // Empty array - free users don't get hidden opportunities
    }

    // Fire telemetry — non-blocking, errors are silently swallowed
    logPredictionEvent(buildPredictionEvent(
      aggregate,
      course,
      annotatedResults,
      hasPremium,
      schoolRegionFlags ?? {},
    ));

    log.perf('predict.complete', startMs, { isPremium: hasPremium, resultCount: responseResults.length });

    return NextResponse.json({
      results:            responseResults,
      safeBets:           responseSafeBets,
      hiddenOpportunities: responseHiddenOpportunities,
      anomalyDetection:   anomalyDetection.hasAnomaly ? anomalyDetection : null,
      dataManifest: {
        version:     DATA_MANIFEST.version,
        lastUpdated: DATA_MANIFEST.lastUpdated,
        nextUpdate:  DATA_MANIFEST.nextUpdate,
        sourceNote:  DATA_MANIFEST.sourceNote,
      },
      // Include premium status so client knows what it received
      _premium: hasPremium,
    });
  } catch (error: any) {
    const log = createLogger(request);
    // Distinguish Firebase connectivity failures from logic errors.
    // Firebase errors contain 'FIREBASE' or network-level codes.
    const isFirebaseDown =
      error?.code?.startsWith('FIREBASE') ||
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('firebase');

    if (isFirebaseDown) {
      log.error('predict.firebase_unavailable', error);
      return NextResponse.json(
        { error: 'Our data service is temporarily unavailable. Please try again in a moment.' },
        { status: 503, headers: { 'Retry-After': '30' } }
      );
    }

    log.error('predict.unhandled_error', error);
    return NextResponse.json(
      { error: 'Prediction request failed. Please try again.' },
      { status: 500 }
    );
  }
}
