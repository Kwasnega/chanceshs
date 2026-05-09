import { NextResponse } from 'next/server';
import { calculateProbability } from '@/services/predictionEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { aggregate, schools, course } = await request.json();

    if (!aggregate || !schools || !Array.isArray(schools)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Dynamically import Firebase only when needed
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const results = await Promise.all(schools.map(async (school: any) => {
      const schoolRef = ref(rtdb, `schools/${school.id}`);
      const snapshot = await get(schoolRef);
      
      let historicalCutoff = 10;
      let category = school.category || 'C';

      if (snapshot.exists()) {
        const schoolData = snapshot.val();
        category = schoolData.category;
        historicalCutoff = schoolData.historicalCutoffs?.['2023'] || 10;
      }

      const prediction = calculateProbability(aggregate, category, historicalCutoff, course);
      
      // Detailed Insights
      const recommendations: Record<string, string> = {
        'safe': 'Strong choice. Highly likely to be placed here.',
        'competitive': 'Possible, but consider adding a safety school.',
        'risky': 'Very high competition. Recommended only as a first choice with strong backups.'
      };

      return {
        ...prediction,
        schoolId: school.id,
        schoolName: school.name,
        category,
        recommendation: recommendations[prediction.matchType] || 'Standard choice.',
        cutoffRange: `2019-2023: ${historicalCutoff - 2}-${historicalCutoff + 1}`,
        trend: category === 'A' ? 'Increasingly Competitive' : 'Stable',
        locked: school.category === 'A' && prediction.probability < 85
      };
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Prediction API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
