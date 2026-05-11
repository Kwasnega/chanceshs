/**
 * Next.js 16 Proxy (formerly middleware.ts — renamed per Next.js 16 convention).
 *
 * Responsibilities:
 *   1. Correlation ID: inject `X-Request-ID` into every /api/* response so
 *      every log line, Firebase write, and Paystack call can be tied back to
 *      a single user request. Essential for production incident debugging.
 *
 *   2. Security headers: harden all responses with standard protective headers.
 */

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/api/:path*',
};

export function proxy(request: NextRequest) {
  const clientId = request.headers.get('x-request-id');
  const requestId =
    clientId && /^[a-zA-Z0-9\-_]{8,64}$/.test(clientId)
      ? clientId
      : crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('x-request-id', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}
