import { NextRequest, NextResponse } from 'next/server';
import { predictionEngine, PredictionInput, ProgramType } from '@/lib/predictionEngine';
import { schoolCache } from '@/lib/schoolCache';
import { buildSchoolData } from '@/lib/schoolBuilder';
import { validateSuggestInput } from '@/lib/inputValidation';

export const dynamic = 'force-dynamic';

// Shared rate limiter for suggest endpoint — stricter than predict (5 req / 60s)
// because it runs predictions for the entire school catalogue.
const suggestRateMap = new Map<string, { count: number; resetAt: number }>();
const SUGGEST_MAX = 5;
const SUGGEST_WINDOW_MS = 60_000;

function checkSuggestRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = suggestRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    suggestRateMap.set(ip, { count: 1, resetAt: now + SUGGEST_WINDOW_MS });
    return true;
  }
  if (entry.count >= SUGGEST_MAX) return false;
  entry.count++;
  return true;
}

// POST /api/schools/suggest
// Body: { aggregate, rawScore, grades, course, excludeIds: string[] }
// Returns: up to 20 qualifying schools ranked by probability (real engine output)
export async function POST(request: NextRequest) {
  // Rate limit — suggest runs full-catalogue predictions, making it a heavier target
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (!checkSuggestRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before requesting more suggestions.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();

    const validation = validateSuggestInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { aggregate, rawScore, grades, course, excludeIds = [] } = body;

    const programTypeMap: Record<string, ProgramType> = {
      'General Science':  ProgramType.SCIENCE,
      'General Arts':     ProgramType.GENERAL_ARTS,
      'Business':         ProgramType.BUSINESS,
      'Agriculture':      ProgramType.SCIENCE,
      'Visual Arts':      ProgramType.ARTS,
    };
    const programType = programTypeMap[course] || ProgramType.GENERAL_ARTS;

    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const excludeSet = new Set<string>(excludeIds);

    // Fetch all schools with thundering-herd protection.
    // On a cache hit: instant, zero Firebase reads.
    // On a cache miss with N concurrent requests: exactly ONE Firebase read;
    // all other N-1 requests await the same in-flight Promise.
    let rawSchools: any[];
    try {
      rawSchools = await schoolCache.fetchAllWithLock(async () => {
        const snapshot = await get(ref(rtdb, 'schools'));
        if (!snapshot.exists()) return [];
        return Object.entries(snapshot.val())
          .map(([id, data]: [string, any]) => ({ id, ...(data as object) }));
      });
    } catch {
      // Firebase unavailable — return empty suggestions gracefully (don't break the results page)
      return NextResponse.json({ suggestions: [], _degraded: true }, { status: 200 });
    }
    if (rawSchools.length === 0) return NextResponse.json({ suggestions: [] });

    // Exclude already-selected schools and build SchoolData using shared builder
    // (fixes the courseAdj sign bug that was in the previous inline implementation)
    const schoolDataArray = rawSchools
      .filter(s => !excludeSet.has(s.id))
      .map(s => buildSchoolData(s.id, s.name || s.id, s, course));

    const predictionInput: PredictionInput = {
      aggregate,
      rawScore,
      grades: {
        english:      grades.english      || 0,
        math:         grades.math         || 0,
        science:      grades.science      || 0,
        socialStudies: grades.social      || 0,
        elective1:    grades.el1          || 0,
        elective2:    grades.el2          || 0,
      },
      program:        programType,
      selectedSchools: schoolDataArray.map(s => s.id),
    };

    const predictions = predictionEngine.predictWithSchoolData(predictionInput, schoolDataArray);

    // Filter to meaningful probability (≥20%), sort descending, take top 20
    const suggestions = predictions
      .filter(p => p.probability >= 20)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 20)
      .map(p => ({
        schoolId:    p.schoolId,
        schoolName:  p.schoolName,
        probability: p.probability,
        confidence:  p.confidence,
        category:    p.category,
        tier:        p.tier,
      }));

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Suggest API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
