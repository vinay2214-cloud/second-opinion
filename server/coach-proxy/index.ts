import { coachConfig as C } from '../../src/core/data.js';
import { validateCoachFacts, validateCoachText } from '../../src/core/coach.js';
import type { CoachFacts } from '../../src/core/coach.js';
import { callGemini, keyShape } from './provider.js';
import { COACH_REASONS, COACH_STAGES } from './types.js';
import type { CoachEnvironment, CoachProvider, CoachReason, CoachTrace } from './types.js';

export interface CoachProxyOptions {
  provider?: CoachProvider;
  now?: () => number;
}
type Bucket = { count: number; expires: number };

function allowedOrigin(origin: string | null, list: string | undefined): string | undefined {
  if (!origin || origin === 'null' || !list?.split(',').map((s) => s.trim()).includes(origin)) return undefined;
  try {
    const url = new URL(origin);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return url.origin === origin && (url.protocol === 'https:' || (local && url.protocol === 'http:'))
      ? origin : undefined;
  } catch {
    return undefined;
  }
}

async function limitedBody(request: Request, signal: AbortSignal): Promise<string | undefined> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > C.limits.maxBodyBytes) {
        cancel();
        return undefined;
      }
      chunks.push(value);
    }
    if (signal.aborted) return undefined;
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

/** One map per Worker isolate: best effort, bounded memory, no persistent identifiers/logs. */
export function createCoachProxy({ provider = callGemini, now = Date.now }: CoachProxyOptions = {}) {
  const buckets = new Map<string, Bucket>();
  const hourMs = 60 * 60 * 1000;
  const maxBuckets = 4096;

  function allow(ip: string): boolean {
    const time = now();
    for (const [key, bucket] of buckets) if (bucket.expires <= time) buckets.delete(key);
    const bucket = buckets.get(ip);
    if (bucket) {
      if (bucket.count >= C.limits.rateLimitPerIpPerHour) return false;
      bucket.count++;
      return true;
    }
    // Fail closed on saturation rather than evicting a rate-limited address.
    if (buckets.size >= maxBuckets) return false;
    buckets.set(ip, { count: 1, expires: time + hourMs });
    return true;
  }

  return async (request: Request, env: CoachEnvironment): Promise<Response> => {
    let origin: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    // One log line per request: a fixed reason code, a numeric upstream status, the fixed
    // name of a step that threw with the error's class name, and three booleans about the
    // key's shape. Nothing from the request, the key, the model text or any error message.
    let reason: CoachReason = 'fallback';
    let logged = false;
    const trace: CoachTrace = {};
    const respond = (status: number, why: CoachReason, text?: string): Response => {
      if (!logged) reason = why;
      const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
      if (origin) headers.set('Access-Control-Allow-Origin', origin);
      if (text !== undefined) headers.set('Content-Type', 'application/json');
      return new Response(text === undefined ? null : JSON.stringify({ text }), { status, headers });
    };
    const abort = () => controller?.abort();
    try {
      // Guard order is deliberate: disabled deployments never process payloads.
      if (env.COACH_ENABLED !== 'true') return respond(503, 'disabled');
      origin = allowedOrigin(request.headers.get('Origin'), env.COACH_ALLOWED_ORIGINS);
      if (!origin) return respond(403, 'bad_origin');
      if (new URL(request.url).pathname !== '/coach') return respond(404, 'bad_request');
      if (request.method === 'OPTIONS') {
        const method = request.headers.get('Access-Control-Request-Method');
        const headers = (request.headers.get('Access-Control-Request-Headers') ?? '')
          .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (method !== 'POST' || headers.some((h) => h !== 'content-type')) return respond(403, 'bad_request');
        const response = respond(204, 'preflight');
        response.headers.set('Access-Control-Allow-Methods', 'POST');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        return response;
      }
      if (request.method !== 'POST') return respond(405, 'bad_request');
      const length = request.headers.get('Content-Length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > C.limits.maxBodyBytes)) return respond(413, 'body_too_large');
      if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return respond(415, 'bad_request');
      if (request.signal.aborted) return respond(204, 'fallback');
      controller = new AbortController();
      const signal = controller.signal;
      request.signal.addEventListener('abort', abort, { once: true });
      let calling = false;
      const timeout = new Promise<Response>((resolve) => {
        timer = setTimeout(() => {
          resolve(respond(204, calling ? 'upstream_timeout' : 'fallback'));
          abort();
        }, C.limits.timeoutMs);
      });
      const work = (async (): Promise<Response> => {
        let value: unknown;
        try {
          const body = await limitedBody(request, signal);
          if (signal.aborted) return respond(204, 'fallback');
          if (body === undefined) return respond(413, 'body_too_large');
          value = JSON.parse(body);
        } catch {
          return respond(400, 'bad_json');
        }
        if (!validateCoachFacts(value).ok) return respond(400, 'bad_facts');
        // Cloudflare supplies this header. Missing IPs share a conservative bucket.
        if (!allow(request.headers.get('CF-Connecting-IP') ?? 'missing')) return respond(429, 'rate_limited');
        if (signal.aborted) return respond(204, 'fallback');
        calling = true;
        const text = await provider(value as CoachFacts, env, signal, trace);
        if (signal.aborted) return respond(204, 'fallback');
        if (typeof text !== 'string' || text === '') {
          // Only a known fixed code from the provider is accepted.
          const why = COACH_REASONS.find((code) => code === trace.reason && code !== 'ok');
          return respond(204, why ?? 'upstream_empty');
        }
        const valid = validateCoachText(text, value);
        return valid.ok ? respond(200, 'ok', valid.text) : respond(204, 'text_rejected');
      })().catch(() => respond(204, 'fallback'));
      return await Promise.race([work, timeout]);
    } catch {
      return respond(204, 'fallback');
    } finally {
      logged = true;
      const upstream = Number.isInteger(trace.upstream) ? String(trace.upstream) : 'none';
      const stage = COACH_STAGES.find((name) => name === trace.stage) ?? 'none';
      const err = stage !== 'none' && typeof trace.err === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(trace.err)
        ? trace.err : 'none';
      const shape = keyShape(env.COACH_API_KEY);
      console.log(
        `coach: reason=${reason} upstream=${upstream} stage=${stage} err=${err}`
        + ` key_len_ok=${shape.len} key_prefix_ok=${shape.prefix} key_charset_ok=${shape.charset}`,
      );
      if (timer !== undefined) clearTimeout(timer);
      request.signal.removeEventListener('abort', abort);
      abort();
    }
  };
}

export default { fetch: createCoachProxy() };
