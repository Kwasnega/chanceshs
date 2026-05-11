import { NextRequest, NextResponse } from 'next/server';
import { 
  getPaymentByReference,
  updatePaymentStatus,
  createEntitlement,
  grantBundleEntitlements,
  getUser,
  ProductType,
  FeatureType,
  PaymentStatus
} from '@/lib/firebasePayment';

export const dynamic = 'force-dynamic';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.redirect(new URL('/pricing?error=no_reference', request.url));
  }

  try {
    // Verify transaction with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack verification error:', paystackData);
      const payment = await getPaymentByReference(reference);
      if (payment) {
        await updatePaymentStatus(payment.id, PaymentStatus.FAILED, undefined, paystackData);
      }
      return NextResponse.redirect(new URL('/pricing?error=payment_failed', request.url));
    }

    const transaction = paystackData.data;

    if (transaction.status !== 'success') {
      const payment = await getPaymentByReference(reference);
      if (payment) {
        await updatePaymentStatus(payment.id, PaymentStatus.FAILED, transaction.id, paystackData);
      }
      return NextResponse.redirect(new URL('/pricing?error=payment_not_successful', request.url));
    }

    const payment = await getPaymentByReference(reference);
    if (!payment) {
      return NextResponse.redirect(new URL('/pricing?error=payment_not_found', request.url));
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      const userId = payment.userId;
      if (payment.productId === ProductType.PREMIUM_REPORT || 
          payment.productId === ProductType.BUNDLE_COMPLETE ||
          payment.productId === ProductType.BUNDLE_FULL) {
        return NextResponse.redirect(new URL(`/calculator?step=3&payment_success=true&userId=${userId}`, request.url));
      } else if (payment.productId === ProductType.EARLY_ALERT) {
        return NextResponse.redirect(new URL('/pricing?success=true&product=early_alert', request.url));
      } else if (payment.productId === ProductType.SHS_KIT_BUNDLER) {
        return NextResponse.redirect(new URL('/pricing?success=true&product=shs_kit_bundler', request.url));
      }
      return NextResponse.redirect(new URL('/pricing?success=true', request.url));
    }

    await updatePaymentStatus(
      payment.id,
      PaymentStatus.SUCCESSFUL,
      transaction.id,
      paystackData
    );

    const userId = payment.userId;
    const productId = payment.productId;

    if (productId === ProductType.PREMIUM_REPORT) {
      await createEntitlement(userId, payment.id, FeatureType.PREMIUM_REPORT);
    } else if (productId === ProductType.EARLY_ALERT) {
      await createEntitlement(userId, payment.id, FeatureType.EARLY_ALERT);
    } else if (productId === ProductType.BUNDLE_COMPLETE) {
      await grantBundleEntitlements(userId, payment.id, [
        ProductType.PREMIUM_REPORT,
        ProductType.EARLY_ALERT
      ]);
    } else if (productId === ProductType.BUNDLE_FULL) {
      await grantBundleEntitlements(userId, payment.id, [
        ProductType.PREMIUM_REPORT,
        ProductType.EARLY_ALERT
      ]);
      await createEntitlement(userId, payment.id, FeatureType.SHS_KIT_PREVIEW);
    } else if (productId === ProductType.SHS_KIT_BUNDLER) {
      await createEntitlement(userId, payment.id, FeatureType.SHS_KIT_PREVIEW);
    }

    if (productId === ProductType.PREMIUM_REPORT || 
        productId === ProductType.BUNDLE_COMPLETE ||
        productId === ProductType.BUNDLE_FULL) {
      return NextResponse.redirect(new URL(`/calculator?step=3&payment_success=true&userId=${userId}`, request.url));
    } else if (productId === ProductType.EARLY_ALERT) {
      return NextResponse.redirect(new URL(`/pricing?success=true&product=early_alert`, request.url));
    } else if (productId === ProductType.SHS_KIT_BUNDLER) {
      return NextResponse.redirect(new URL(`/pricing?success=true&product=shs_kit_bundler`, request.url));
    }

    return NextResponse.redirect(new URL('/pricing?success=true', request.url));

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.redirect(new URL('/pricing?error=verification_failed', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      const payment = await getPaymentByReference(reference);
      if (payment) {
        await updatePaymentStatus(payment.id, PaymentStatus.FAILED, undefined, paystackData);
      }
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    const transaction = paystackData.data;

    if (transaction.status !== 'success') {
      const payment = await getPaymentByReference(reference);
      if (payment) {
        await updatePaymentStatus(payment.id, PaymentStatus.FAILED, transaction.id, paystackData);
      }
      return NextResponse.json({ success: false, status: transaction.status });
    }

    const payment = await getPaymentByReference(reference);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      return NextResponse.json({ success: true, alreadyProcessed: true, payment });
    }

    await updatePaymentStatus(payment.id, PaymentStatus.SUCCESSFUL, transaction.id, paystackData);

    const userId = payment.userId;
    const productId = payment.productId;

    if (productId === ProductType.PREMIUM_REPORT) {
      await createEntitlement(userId, payment.id, FeatureType.PREMIUM_REPORT);
    } else if (productId === ProductType.EARLY_ALERT) {
      await createEntitlement(userId, payment.id, FeatureType.EARLY_ALERT);
    } else if (productId === ProductType.BUNDLE_COMPLETE) {
      await grantBundleEntitlements(userId, payment.id, [
        ProductType.PREMIUM_REPORT,
        ProductType.EARLY_ALERT
      ]);
    } else if (productId === ProductType.BUNDLE_FULL) {
      await grantBundleEntitlements(userId, payment.id, [
        ProductType.PREMIUM_REPORT,
        ProductType.EARLY_ALERT
      ]);
      await createEntitlement(userId, payment.id, FeatureType.SHS_KIT_PREVIEW);
    }

    return NextResponse.json({ success: true, payment });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
