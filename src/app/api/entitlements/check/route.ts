import { NextRequest, NextResponse } from 'next/server';
import { 
  checkUserEntitlement, 
  getUserEntitlements,
  getUser,
  FeatureType 
} from '@/lib/firebasePayment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const featureType = searchParams.get('featureType');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId parameter' },
      { status: 400 }
    );
  }

  try {
    if (featureType) {
      // Check specific entitlement
      const hasAccess = await checkUserEntitlement(userId, featureType as FeatureType);
      return NextResponse.json({
        userId,
        featureType,
        hasAccess
      });
    } else {
      // Get all entitlements
      const entitlements = await getUserEntitlements(userId);
      const user = await getUser(userId);
      
      return NextResponse.json({
        userId,
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
