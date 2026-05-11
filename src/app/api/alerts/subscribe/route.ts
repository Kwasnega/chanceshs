import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normaliseGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return `+${digits}`;
}

async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) { console.warn('SMS_API_KEY not set — skipping SMS'); return; }
  await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: 'ChanceSHS', message, recipients: [to] }),
  });
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiKey) { console.warn('WHATSAPP_API_KEY not set — skipping WhatsApp'); return; }
  await fetch('https://sms.arkesel.com/api/v2/whatsapp/send', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: 'ChanceSHS', message, recipients: [to] }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phone, whatsapp, email, schools, paymentRef } = body;

    if (!userId || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, name, phone' },
        { status: 400 }
      );
    }

    const normPhone    = normaliseGhanaPhone(phone);
    const normWhatsapp = whatsapp ? normaliseGhanaPhone(whatsapp) : normPhone;

    const { ref, set, update } = await import('firebase/database');
    const { rtdb } = await import('@/lib/firebase');

    const alertData = {
      userId,
      name,
      phone: normPhone,
      whatsapp: normWhatsapp,
      email:    email    || '',
      schools:  schools  || [],
      paymentRef: paymentRef || '',
      status: 'active',
      dispatched: false,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    };

    await set(ref(rtdb, `early_alerts/${userId}`), alertData);
    await update(ref(rtdb, `users/${userId}`), {
      phone: normPhone,
      alertActive: true,
      updatedAt: new Date().toISOString(),
    });

    // Fire-and-forget confirmation messages
    const confirmSms = `You're registered for ChanceSHS Early Alert. We'll notify you instantly when BECE placements are released. — ChanceSHS`;
    const confirmWa  = `✅ You're on the list! ChanceSHS will message you the moment BECE placement results drop. Stay tuned — chanceshs.com`;

    Promise.allSettled([
      sendSms(normPhone, confirmSms),
      sendWhatsApp(normWhatsapp, confirmWa),
    ]).catch(() => { /* swallow async errors */ });

    return NextResponse.json({ success: true, message: 'Alert registered successfully' });
  } catch (error) {
    console.error('Alert subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
