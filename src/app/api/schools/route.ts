import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search    = searchParams.get('search')?.toLowerCase()    || '';
  const category  = searchParams.get('category')?.toUpperCase() || '';
  const region    = searchParams.get('region')?.toLowerCase()   || '';
  const gender    = searchParams.get('gender')?.toLowerCase()   || '';
  const boarding  = searchParams.get('boarding')?.toLowerCase() || '';
  const page      = parseInt(searchParams.get('page') || '1', 10);
  const limit     = parseInt(searchParams.get('limit') || '24', 10);

  try {
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const snapshot = await get(ref(rtdb, 'schools'));

    if (!snapshot.exists()) {
      return NextResponse.json({ schools: [], total: 0, page, totalPages: 0 });
    }

    let schools: any[] = Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
      id,
      ...(data as object),
    }));

    // Client-side filters
    if (search) {
      schools = schools.filter(s =>
        s.name?.toLowerCase().includes(search) ||
        s.region?.toLowerCase().includes(search) ||
        s.location?.toLowerCase().includes(search)
      );
    }
    if (category) {
      schools = schools.filter(s => s.category?.toUpperCase() === category);
    }
    if (region) {
      schools = schools.filter(s => s.region?.toLowerCase().includes(region));
    }
    if (gender) {
      schools = schools.filter(s => {
        const g = (s.gender || '').toLowerCase();
        if (gender === 'mixed') return g.includes('mixed') || g.includes('co-ed') || g.includes('both');
        if (gender === 'boys')  return g.includes('boy') || g.includes('male');
        if (gender === 'girls') return g.includes('girl') || g.includes('female');
        return true;
      });
    }
    if (boarding) {
      schools = schools.filter(s => {
        const st = (s.status || '').toLowerCase();
        if (boarding === 'boarding') return st.includes('boarding');
        if (boarding === 'day')      return st.includes('day') && !st.includes('boarding');
        return true;
      });
    }

    // Sort: by category (A→E), then name
    const catOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    schools.sort((a, b) => {
      const catDiff = (catOrder[a.category] || 9) - (catOrder[b.category] || 9);
      if (catDiff !== 0) return catDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    const total      = schools.length;
    const totalPages = Math.ceil(total / limit);
    const start      = (page - 1) * limit;
    const paged      = schools.slice(start, start + limit);

    return NextResponse.json({ schools: paged, total, page, totalPages });
  } catch (error: any) {
    console.error('Schools API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
