import { NextRequest, NextResponse } from 'next/server';
import { DATA_MANIFEST, getDataFreshness } from '@/lib/dataManifest';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const freshness = getDataFreshness();

  const estimated = DATA_MANIFEST.schools.filter(s => s.dataQuality === 'estimated');
  const crossChecked = DATA_MANIFEST.schools.filter(s => s.dataQuality === 'community_cross_checked');
  const verified = DATA_MANIFEST.schools.filter(s => s.dataQuality === 'verified');

  const lowDataSchools = DATA_MANIFEST.schools.filter(s => s.yearsOfData < 2);

  return NextResponse.json({
    version:         DATA_MANIFEST.version,
    lastUpdated:     DATA_MANIFEST.lastUpdated,
    nextUpdate:      DATA_MANIFEST.nextUpdate,
    freshness,
    freshnessAlert:  freshness !== 'current'
      ? `Data is ${freshness}. Update required before next BECE cycle.`
      : null,
    summary: {
      totalSchools:      DATA_MANIFEST.schools.length,
      verified:          verified.length,
      communityChecked:  crossChecked.length,
      estimated:         estimated.length,
      lowDataCount:      lowDataSchools.length,
    },
    schools:               DATA_MANIFEST.schools,
    lowDataSchools,
    validationPipeline:    DATA_MANIFEST.validationPipeline,
    methodology:           DATA_MANIFEST.methodology,
    disclaimer:            DATA_MANIFEST.disclaimer,
    updateSchedule:        DATA_MANIFEST.updateSchedule,
  });
}
