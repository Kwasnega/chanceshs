import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  // Verify signature using Paystack Secret Key
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

  if (hash !== signature) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.event === 'charge.success') {
    const { reference, customer } = event.data;
    // In a real app:
    // 1. Update transactions table in Firestore
    // 2. Set user is_premium = true in users collection
    console.log(`Payment success for ${customer.email} with reference ${reference}`);
  }

  return NextResponse.json({ status: 'success' });
}
