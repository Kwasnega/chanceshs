/**
 * requestLogger.ts
 * Structured JSON logger for API route handlers.
 *
 * Why structured JSON:
 *   Plain console.log produces unstructured strings that are impossible to
 *   query in Vercel Log Drains, Datadog, or any log aggregator.
 *   JSON logs are machine-parseable: you can filter by requestId, endpoint,
 *   latency > 2000, or error: true in any log tool.
 *
 * Usage:
 *   const log = createLogger(request);          // at top of handler
 *   log.info('predict.start', { aggregate });   // structured event
 *   log.error('firebase.fail', err);            // error event
 *   log.perf('predict.complete', startMs);      // latency measurement
 */

export interface LogEntry {
  ts:        string;   // ISO timestamp
  level:     'info' | 'warn' | 'error' | 'perf';
  event:     string;   // dot-namespaced event name, e.g. "predict.start"
  requestId: string;   // correlation ID from X-Request-ID header
  endpoint:  string;   // /api/predict
  ip:        string;   // anonymized (last octet stripped)
  latencyMs?: number;  // for perf events
  [key: string]: unknown;
}

export interface Logger {
  info:  (event: string, meta?: Record<string, unknown>) => void;
  warn:  (event: string, meta?: Record<string, unknown>) => void;
  error: (event: string, err?: unknown, meta?: Record<string, unknown>) => void;
  perf:  (event: string, startMs: number, meta?: Record<string, unknown>) => void;
}

/** Strip last octet of IPv4 / last group of IPv6 to avoid storing full IPs. */
function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.')) {
    // IPv4: 1.2.3.4 → 1.2.3.x
    const parts = ip.split('.');
    parts[parts.length - 1] = 'x';
    return parts.join('.');
  }
  // IPv6: truncate last segment
  const parts = ip.split(':');
  if (parts.length > 1) parts[parts.length - 1] = 'xxxx';
  return parts.join(':');
}

function write(entry: LogEntry): void {
  // In production Vercel picks these up as structured logs when output as JSON
  const line = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Create a logger bound to the current request's correlation ID and endpoint.
 * Call once at the top of each API handler.
 */
export function createLogger(request: { headers: { get: (k: string) => string | null }; url?: string }): Logger {
  const requestId = request.headers.get('x-request-id') || 'no-id';
  const rawIp     = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                 || request.headers.get('x-real-ip')
                 || 'unknown';
  const ip        = anonymizeIp(rawIp);
  const endpoint  = request.url
    ? (() => { try { return new URL(request.url).pathname; } catch { return '?'; } })()
    : '?';

  const now = () => new Date().toISOString();

  return {
    info(event, meta = {}) {
      write({ ts: now(), level: 'info', event, requestId, ip, endpoint, ...meta });
    },
    warn(event, meta = {}) {
      write({ ts: now(), level: 'warn', event, requestId, ip, endpoint, ...meta });
    },
    error(event, err, meta = {}) {
      const errMeta: Record<string, unknown> = err instanceof Error
        ? { errorMessage: err.message, errorStack: err.stack?.split('\n')[1]?.trim() }
        : { errorRaw: String(err) };
      write({ ts: now(), level: 'error', event, requestId, ip, endpoint, ...errMeta, ...meta });
    },
    perf(event, startMs, meta = {}) {
      write({ ts: now(), level: 'perf', event, requestId, ip, endpoint, latencyMs: Date.now() - startMs, ...meta });
    },
  };
}
