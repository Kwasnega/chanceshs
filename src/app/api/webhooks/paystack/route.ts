import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  getPaymentByReference,
  updatePaymentStatus,
  createEntitlement,
  grantBundleEntitlements,
  logWebhookEvent,
  updateWebhookStatus,
  ProductType,
  FeatureType,
  PaymentStatus
} from '@/lib/firebasePayment';

export const dynamic = 'force-dynamic';

// Track processed webhook events to prevent replay attacks
const processedEvents = new Map<string, number>();
const EVENT_TTL = 300000; // 5 minutes

function cleanupProcessedEvents() {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > EVENT_TTL) {
      processedEvents.delete(eventId);
    }
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return new Response('Server configuration error', { status: 500 });
  }

  // Verify signature using Paystack Secret Key (CRITICAL SECURITY)
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

  if (hash !== signature) {
    console.error('Invalid webhook signature');
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  // Check for replay attacks
  const eventId = `${event.event}_${event.data?.reference}_${event.data?.id}`;
  cleanupProcessedEvents();
  
  if (processedEvents.has(eventId)) {
    console.log(`Duplicate webhook event detected: ${eventId}`);
    return NextResponse.json({ status: 'duplicate', message: 'Event already processed' });
  }

  processedEvents.set(eventId, Date.now());

  try {
    const webhookId = await logWebhookEvent(event.event, event, signature);

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data, webhookId);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(event.data, webhookId);
        break;
      
      case 'transfer.success':
        await handleTransferSuccess(event.data, webhookId);
        break;
      
      case 'transfer.failed':
        await handleTransferFailed(event.data, webhookId);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    await updateWebhookStatus(webhookId, 'processed');
    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 even on error to prevent Paystack from retrying indefinitely
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

async function handleChargeSuccess(data: any, webhookId: string) {
  const { reference, customer, metadata, amount, currency, paid_at, channel } = data;

  const payment = await getPaymentByReference(reference);
  
  if (payment && payment.status === PaymentStatus.SUCCESSFUL) {
    console.log(`Payment ${reference} already processed`);
    return;
  }

  if (payment) {
    await updatePaymentStatus(payment.id, PaymentStatus.SUCCESSFUL, data.id, data);
  }

  const userId = metadata?.userId || customer?.customer_code || payment?.userId;
  const productId = metadata?.productId || payment?.productId;

  if (!userId || !productId) {
    console.error('Missing userId or productId in webhook data');
    return;
  }

  if (productId === ProductType.PREMIUM_REPORT) {
    await createEntitlement(userId, payment?.id || reference, FeatureType.PREMIUM_REPORT);
  } else if (productId === ProductType.EARLY_ALERT) {
    await createEntitlement(userId, payment?.id || reference, FeatureType.EARLY_ALERT);
  } else if (productId === ProductType.BUNDLE_COMPLETE) {
    await grantBundleEntitlements(userId, payment?.id || reference, [
      ProductType.PREMIUM_REPORT,
      ProductType.EARLY_ALERT
    ]);
  } else if (productId === ProductType.BUNDLE_FULL) {
    await grantBundleEntitlements(userId, payment?.id || reference, [
      ProductType.PREMIUM_REPORT,
      ProductType.EARLY_ALERT
    ]);
    await createEntitlement(userId, payment?.id || reference, FeatureType.SHS_KIT_PREVIEW);
  }

  console.log(`Payment ${reference} processed successfully via webhook`);
}

async function handleChargeFailed(data: any, webhookId: string) {
  const { reference } = data;

  const payment = await getPaymentByReference(reference);
  if (payment) {
    await updatePaymentStatus(payment.id, PaymentStatus.FAILED, data.id, data);
  }

  console.log(`Payment ${reference} failed`);
}

async function handleTransferSuccess(data: any, webhookId: string) {
  console.log(`Transfer ${data.reference} successful`);
}

async function handleTransferFailed(data: any, webhookId: string) {
  console.log(`Transfer ${data.reference} failed`);
}
