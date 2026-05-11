import { NextRequest, NextResponse } from 'next/server';
import { 
  checkUserEntitlement, 
  getUserEntitlements,
  getUser,
  FeatureType 
} from '@/lib/firebasePayment';

export const dynamic = 'force-dynamic';

// Helper to normalize email for consistent lookup
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const featureType = searchParams.get('featureType');

  // C3 fix: Support both userId and email for lookup
  const lookupId = email ? normalizeEmail(email) : userId;

  if (!lookupId) {
    return NextResponse.json(
      { error: 'Missing userId or email parameter' },
      { status: 400 }
    );
  }

  try {
    if (featureType) {
      // Check specific entitlement
      const hasAccess = await checkUserEntitlement(lookupId, featureType as FeatureType);
      return NextResponse.json({
        userId: lookupId,
        featureType,
        hasAccess
      });
    } else {
      // Get all entitlements
      const entitlements = await getUserEntitlements(lookupId);
      const user = await getUser(lookupId);
      
      return NextResponse.json({
        userId: lookupId,
        entitlements,
        user: {
          email: user?.email,
          phone: user?.phone,
          createdAt: user?.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Entitlement check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, featureType } = body;

    if (!userId || !featureType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and featureType' },
        { status: 400 }
      );
    }

    const hasAccess = await checkUserEntitlement(userId, featureType as FeatureType);

    return NextResponse.json({
      userId,
      featureType,
      hasAccess
    });
  } catch (error) {
    console.error('Entitlement check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
