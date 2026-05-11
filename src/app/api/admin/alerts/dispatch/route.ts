import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normaliseGhanaPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return raw;
}

async function sendSms(to: string, message: string): Promise<{ ok: boolean; to: string }> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) return { ok: false, to };
  try {
    const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'ChanceSHS', message, recipients: [to] }),
    });
    return { ok: res.ok, to };
  } catch {
    return { ok: false, to };
  }
}

async function sendWhatsApp(to: string, message: string): Promise<{ ok: boolean; to: string }> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiKey) return { ok: false, to };
  try {
    const res = await fetch('https://sms.arkesel.com/api/v2/whatsapp/send', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'ChanceSHS', message, recipients: [to] }),
    });
    return { ok: res.ok, to };
  } catch {
    return { ok: false, to };
  }
}

export async function POST(request: NextRequest) {
  // Admin auth check
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get, update } = await import('firebase/database');

    const snapshot = await get(ref(rtdb, 'early_alerts'));
    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, sent: 0, message: 'No registered alerts found' });
    }

    const allAlerts: any[] = Object.values(snapshot.val());
    const eligible = allAlerts.filter((a: any) => a.status === 'active' && !a.dispatched);

    if (eligible.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No eligible (un-dispatched) alerts found' });
    }

    const smsText = `Your ChanceSHS alert: BECE placements are out! Check your placement now at chanceshs.com — ChanceSHS`;
    const waText  = `📢 ChanceSHS Alert: BECE placement results are live! Tap here to check your placement → chanceshs.com`;

    let sent = 0;
    let failed = 0;

    for (const alert of eligible) {
      const phone    = normaliseGhanaPhone(alert.phone    || '');
      const whatsapp = normaliseGhanaPhone(alert.whatsapp || alert.phone || '');

      const [smsResult, waResult] = await Promise.allSettled([
        sendSms(phone, smsText),
        sendWhatsApp(whatsapp, waText),
      ]);

      const smsOk = smsResult.status === 'fulfilled' && smsResult.value.ok;
      const waOk  = waResult.status  === 'fulfilled' && waResult.value.ok;

      if (smsOk || waOk) {
        sent++;
        // Mark as dispatched
        await update(ref(rtdb, `early_alerts/${alert.userId}`), {
          dispatched:   true,
          dispatchedAt: new Date().toISOString(),
        });
      } else {
        failed++;
      }
    }

    // Log dispatch event
    const dispatchLog = {
      dispatchedAt:  new Date().toISOString(),
      totalEligible: eligible.length,
      sent,
      failed,
      triggeredBy:   'admin',
    };
    const logRef = ref(rtdb, `dispatch_log/${Date.now()}`);
    await update(logRef, dispatchLog);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: eligible.length,
      message: `Alerts sent to ${sent} of ${eligible.length} users`,
    });
  } catch (error: any) {
    console.error('Dispatch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Admin auth check
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rtdb } = await import('@/lib/firebase');
    const { ref, get } = await import('firebase/database');

    const [alertsSnap, logSnap] = await Promise.all([
      get(ref(rtdb, 'early_alerts')),
      get(ref(rtdb, 'dispatch_log')),
    ]);

    const alerts = alertsSnap.exists() ? Object.values(alertsSnap.val()) : [];
    const logs   = logSnap.exists()   ? Object.values(logSnap.val())    : [];

    const total      = alerts.length;
    const active     = (alerts as any[]).filter((a: any) => a.status === 'active').length;
    const dispatched = (alerts as any[]).filter((a: any) => a.dispatched).length;
    const pending    = active - dispatched;

    return NextResponse.json({ total, active, dispatched, pending, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
