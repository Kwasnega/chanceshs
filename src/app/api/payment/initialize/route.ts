import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { 
  getProduct, 
  createPayment, 
  createUser,
  initializeProducts,
  ProductType,
  PaymentStatus
} from '@/lib/firebasePayment';

export const dynamic = 'force-dynamic';

// Paystack Configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;

// Rate limiting (in-memory for simplicity - use Redis for production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

interface InitializePaymentRequest {
  productId: string;
  email: string;
  userId?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: InitializePaymentRequest = await request.json();
    const { productId, email, userId, phone, metadata = {} } = body;

    // Rate limiting by email
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!productId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: productId and email' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Ensure products are initialized in Firebase
    await initializeProducts();

    // Get product from Firebase
    const product = await getProduct(productId);
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive product ID' },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `CHANCES_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Generate or use provided userId
    const finalUserId = userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create user if doesn't exist
    const existingUser = await getUser(finalUserId);
    if (!existingUser) {
      await createUser(finalUserId, email, phone);
    }

    // Check for duplicate payment (user trying to buy same product again)
    const { get, ref } = await import('firebase/database');
    const { rtdb } = await import('@/lib/firebase');
    const paymentsRef = ref(rtdb, 'payments');
    const paymentsSnapshot = await get(paymentsRef);
    
    if (paymentsSnapshot.exists()) {
      let hasRecentPayment = false;
      paymentsSnapshot.forEach((child) => {
        const payment = child.val();
        if (payment.userId === finalUserId && 
            payment.productId === productId && 
            payment.status === 'successful' &&
            payment.createdAt) {
          const paymentDate = new Date(payment.createdAt);
          const daysSincePayment = (Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePayment < 30) {
            hasRecentPayment = true;
          }
        }
      });

      if (hasRecentPayment) {
        return NextResponse.json(
          { error: 'You have already purchased this product. Check your entitlements.' },
          { status: 409 }
        );
      }
    }

    // Create payment record in Firebase
    const paymentId = await createPayment({
      userId: finalUserId,
      productId: product.id,
      productName: product.name,
      reference,
      amount: product.price,
      currency: product.currency,
      status: PaymentStatus.PENDING,
      paymentMethod: 'momo',
      paymentProvider: 'paystack',
      metadata: {
        email,
        phone,
        ...metadata
      }
    });

    // Prepare Paystack request
    const paystackPayload = {
      email: email,
      amount: Math.round(product.price * 100), // Convert to kobo/pesewas
      currency: product.currency,
      reference: reference,
      metadata: {
        productId: product.id,
        productName: product.name,
        userId: finalUserId,
        paymentId,
        timestamp: new Date().toISOString(),
        ...metadata
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/verify`,
      channels: ['mobile_money'], // Force MoMo channels
      split_code: process.env.PAYSTACK_SPLIT_CODE || undefined,
      subaccount: process.env.PAYSTACK_SUBACCOUNT || undefined,
    };

    // Initialize payment with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack initialization error:', paystackData);
      // Update payment status to failed
      await updatePaymentStatus(paymentId, 'failed', undefined, paystackData);
      return NextResponse.json(
        { error: 'Payment initialization failed', details: paystackData.message },
        { status: 500 }
      );
    }

    // Update payment status to processing
    await updatePaymentStatus(paymentId, 'processing', paystackData.data.reference, paystackData);

    // Return authorization URL and reference
    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      userId: finalUserId,
      paymentId,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        features: product.features
      }
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions (should be moved to firebasePayment.ts)
async function getUser(userId: string): Promise<any> {
  const { get, ref } = await import('firebase/database');
  const { rtdb } = await import('@/lib/firebase');
  const snapshot = await get(ref(rtdb, `users/${userId}`));
  return snapshot.exists() ? snapshot.val() : null;
}

async function updatePaymentStatus(
  paymentId: string,
  status: string,
  providerTransactionId?: string,
  providerResponse?: any
): Promise<void> {
  const { update, ref } = await import('firebase/database');
  const { rtdb } = await import('@/lib/firebase');
  const updates: any = {
    status,
    updatedAt: new Date().toISOString()
  };
  
  if (providerTransactionId) {
    updates.providerTransactionId = providerTransactionId;
  }
  
  if (providerResponse) {
    updates.providerResponse = providerResponse;
  }
  
  if (status === 'successful') {
    updates.verifiedAt = new Date().toISOString();
  }
  
  await update(ref(rtdb, `payments/${paymentId}`), updates);
}

// GET endpoint to retrieve product information
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  // Ensure products are initialized
  await initializeProducts();

  if (productId) {
    const product = await getProduct(productId);
    if (product) {
      return NextResponse.json({
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        description: product.description,
        features: product.features,
        type: product.type,
        includes: product.includes
      });
    }
    return NextResponse.json(
      { error: 'Invalid product ID' },
      { status: 404 }
    );
  }

  // Return all active products
  const products = await getActiveProducts();
  return NextResponse.json(
    products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      description: product.description,
      features: product.features,
      type: product.type,
      includes: product.includes
    }))
  );
}

async function getActiveProducts() {
  const { getActiveProducts } = await import('@/lib/firebasePayment');
  return await getActiveProducts();
}
