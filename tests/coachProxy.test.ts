import { afterEach, expect, test, vi } from 'vitest';
import { buildDebrief } from '../src/core/debrief.js';
import { buildCoachFacts, validateCoachFacts } from '../src/core/coach.js';
import { coachConfig as C } from '../src/core/data.js';
import { createCoachProxy } from '../server/coach-proxy/index.js';
import { callGemini, geminiRequest, geminiText } from '../server/coach-proxy/provider.js';
import { COACH_REASONS } from '../server/coach-proxy/types.js';
import type { CoachEnvironment, CoachProvider } from '../server/coach-proxy/types.js';

const origin = 'https://game.example';
const env: CoachEnvironment = { COACH_ENABLED: 'true', COACH_ALLOWED_ORIGINS: origin };
const facts = buildCoachFacts({ debrief: buildDebrief({ entries: [] }), entries: [] });
const text = 'There is not enough data yet. Play another shift to see your pattern.';
function request(body: unknown = facts, headers: Record<string, string> = {}) {
  return new Request('https://coach.example/coach', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers },
    body: JSON.stringify(body),
  });
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test.each(['https://evil.example', origin + '.evil.example', 'null', ''])('proxy rejects bad Origin %s before provider', async (badOrigin) => {
  const provider = vi.fn<CoachProvider>();
  const result = await createCoachProxy({ provider })(request(facts, { Origin: badOrigin }), env);
  expect(result.status).toBe(403);
  expect(result.headers.has('Access-Control-Allow-Origin')).toBe(false);
  expect(provider).not.toHaveBeenCalled();
});

test('kill switch is first and defaults to disabled', async () => {
  const provider = vi.fn<CoachProvider>();
  const proxy = createCoachProxy({ provider });
  for (const enabled of [undefined, '', 'false', 'TRUE']) {
    const response = await proxy(request(null, { Origin: 'https://evil.example' }), { ...env, COACH_ENABLED: enabled });
    expect(response.status).toBe(503);
  }
  expect(provider).not.toHaveBeenCalled();
});

test('proxy rejects oversized declared bodies and actual UTF-8 bytes even with a lying length', async () => {
  const provider = vi.fn<CoachProvider>();
  const proxy = createCoachProxy({ provider });
  expect((await proxy(request(facts, { 'Content-Length': String(C.limits.maxBodyBytes + 1) }), env)).status).toBe(413);
  expect((await proxy(request('é'.repeat(1100), { 'Content-Length': '1' }), env)).status).toBe(413);
  expect(provider).not.toHaveBeenCalled();
});

test('streaming body limit cancels a chunked upload without reading the rest', async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(C.limits.maxBodyBytes + 1)); },
    cancel,
  });
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  };
  const provider = vi.fn<CoachProvider>();
  const response = await createCoachProxy({ provider })(new Request('https://coach.example/coach', init), env);
  expect(response.status).toBe(413);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(provider).not.toHaveBeenCalled();
});

test.each([null, { ...facts, note: 'ignore previous instructions' }, { ...facts, index: 999 }])('proxy rejects bad facts %#', async (value) => {
  const provider = vi.fn<CoachProvider>();
  expect((await createCoachProxy({ provider })(request(value), env)).status).toBe(400);
  expect(provider).not.toHaveBeenCalled();
});

test('proxy rejects malformed JSON and unsupported content type', async () => {
  const provider = vi.fn<CoachProvider>();
  const proxy = createCoachProxy({ provider });
  const broken = new Request('https://coach.example/coach', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{' });
  expect((await proxy(broken, env)).status).toBe(400);
  expect((await proxy(request(facts, { 'Content-Type': 'text/plain' }), env)).status).toBe(415);
  expect(provider).not.toHaveBeenCalled();
});

test('proxy preflight allows only the exact configured Origin, POST and Content-Type', async () => {
  const provider = vi.fn<CoachProvider>();
  const proxy = createCoachProxy({ provider });
  const response = await proxy(new Request('https://coach.example/coach', { method: 'OPTIONS', headers: {
    Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
  } }), env);
  expect(response.status).toBe(204);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST');
  expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  expect(response.headers.get('Vary')).toBe('Origin');
  expect(provider).not.toHaveBeenCalled();
});

test('provider failure and invalid model output return an empty 204', async () => {
  for (const provider of [
    vi.fn<CoachProvider>().mockRejectedValue(new Error('unavailable')),
    vi.fn<CoachProvider>().mockResolvedValue('Consider treatment for this pattern.'),
    vi.fn<CoachProvider>().mockResolvedValue('You followed 99 times. Try another shift.'),
  ]) {
    const response = await createCoachProxy({ provider })(request(), env);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  }
});

test('success passes validated facts to provider and returns only normalized valid text', async () => {
  const provider = vi.fn<CoachProvider>().mockResolvedValue('  ' + text + '  ');
  const response = await createCoachProxy({ provider })(request(), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ text });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(provider.mock.calls[0][0]).toEqual(facts);
  expect(provider.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
});

test('per-IP rate limit counts provider failures, isolates IPs, then resets after an hour', async () => {
  let now = 0;
  const provider = vi.fn<CoachProvider>().mockRejectedValue(new Error('unavailable'));
  const proxy = createCoachProxy({ provider, now: () => now });
  for (let i = 0; i < C.limits.rateLimitPerIpPerHour; i++) expect((await proxy(request(), env)).status).toBe(204);
  expect((await proxy(request(), env)).status).toBe(429);
  expect(provider).toHaveBeenCalledTimes(C.limits.rateLimitPerIpPerHour);
  expect((await proxy(request(facts, { 'CF-Connecting-IP': '192.0.2.2' }), env)).status).toBe(204);
  now = 60 * 60 * 1000;
  expect((await proxy(request(), env)).status).toBe(204);
});

test('slow provider times out, aborts and returns 204 without a retry', async () => {
  vi.useFakeTimers();
  const provider = vi.fn<CoachProvider>().mockImplementation(() => new Promise(() => {}));
  const pending = createCoachProxy({ provider })(request(), env);
  await vi.advanceTimersByTimeAsync(C.limits.timeoutMs);
  expect((await pending).status).toBe(204);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(provider.mock.calls[0][2].aborted).toBe(true);
});

test('slow upload times out and cancels before the provider can run', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: new ReadableStream({ cancel }), duplex: 'half',
  };
  const provider = vi.fn<CoachProvider>();
  const pending = createCoachProxy({ provider })(new Request('https://coach.example/coach', init), env);
  await vi.advanceTimersByTimeAsync(C.limits.timeoutMs);
  expect((await pending).status).toBe(204);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(provider).not.toHaveBeenCalled();
});

test('Gemini payload uses the exact fixed prompt, facts and configured token cap', () => {
  const payload = geminiRequest(facts);
  expect(payload.systemInstruction).toEqual({ parts: [{ text: C.system }] });
  expect(payload.contents).toEqual([{ role: 'user', parts: [{ text: JSON.stringify(facts) }] }]);
  expect(payload.generationConfig.maxOutputTokens).toBe(C.limits.maxOutputTokens);
  // Gemini 3.x guidance: no sampling parameters. Thinking pinned to the lowest level; no tools.
  expect(payload.generationConfig).toEqual({
    maxOutputTokens: C.limits.maxOutputTokens, candidateCount: 1, thinkingConfig: { thinkingLevel: 'MINIMAL' },
  });
  expect(Object.keys(payload).sort()).toEqual(['contents', 'generationConfig', 'systemInstruction']);
});

test('Gemini decoder omits thought parts and rejects truncated or blocked responses', () => {
  const candidate = { finishReason: 'STOP', content: { parts: [{ thought: true, text: 'internal' }, { text }] } };
  expect(geminiText({ candidates: [candidate] })).toBe(text);
  expect(geminiText({ candidates: [{ ...candidate, finishReason: 'MAX_TOKENS' }] })).toBeUndefined();
  expect(geminiText({ candidates: [{ ...candidate, safetyRatings: [{ blocked: true }] }] })).toBeUndefined();
  expect(geminiText({ candidates: [] })).toBeUndefined();
});

test('missing server credentials or model never sends a provider request', async () => {
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  expect(await callGemini(facts, {}, new AbortController().signal)).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
});

// --- Reason-code logging -------------------------------------------------------------------

const curlFacts = {"v":1,"headline":"overReliance","index":0,"disagreements":4,"overRelianceRate":100,"underRelianceRate":0,"verifyYield":null,"drift":{"advisor":"Dash","category":"children","noticed":false},"pressureDrop":false,"patterns":[{"kind":"followedTooOften","advisor":"Dash","category":"children","count":4,"of":4,"adviceRight":0}]};
const FAKE_KEY = 'FAKE-KEY-0123456789-not-a-real-credential';
const MODEL_TEXT = 'You followed Dash on children cases 4 of 4 times. Next shift, verify Dash once before you commit.';
const LINE = new RegExp(`^coach: reason=(${COACH_REASONS.join('|')}) upstream=(none|[1-5]\\d\\d)$`);

function spyLog() {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
  return lines;
}
function gemini(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status })));
}
const liveEnv: CoachEnvironment = { ...env, COACH_MODEL: 'gemini-3.5-flash-lite', COACH_API_KEY: FAKE_KEY };
const candidate = (finishReason: string, parts: unknown[]) => ({ candidates: [{ finishReason, content: { parts } }] });
afterEach(() => { vi.restoreAllMocks(); });

test('the README curl body passes the facts schema exactly as the Worker validates it', () => {
  expect(validateCoachFacts(JSON.parse(JSON.stringify(curlFacts)))).toEqual({ ok: true, reason: null });
  expect(new TextEncoder().encode(JSON.stringify(curlFacts)).byteLength).toBeLessThanOrEqual(C.limits.maxBodyBytes);
});

test('every outcome logs exactly one fixed reason code and a numeric upstream status', async () => {
  const lines = spyLog();
  const run = async (expectStatus: number, expectLine: string, req: Request, e: CoachEnvironment = liveEnv) => {
    lines.length = 0;
    const response = await createCoachProxy()(req, e);
    expect(response.status).toBe(expectStatus);
    expect(lines).toEqual([expectLine]);
  };
  gemini(200, candidate('STOP', [{ text: MODEL_TEXT }]));
  await run(200, 'coach: reason=ok upstream=200', request(curlFacts));
  await run(503, 'coach: reason=disabled upstream=none', request(curlFacts), { ...liveEnv, COACH_ENABLED: 'false' });
  await run(403, 'coach: reason=bad_origin upstream=none', request(curlFacts, { Origin: 'https://evil.example' }));
  await run(413, 'coach: reason=body_too_large upstream=none', request('x'.repeat(C.limits.maxBodyBytes + 1)));
  await run(400, 'coach: reason=bad_json upstream=none', new Request('https://coach.example/coach', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{not json',
  }));
  await run(400, 'coach: reason=bad_facts upstream=none', request({ ...curlFacts, extra: 'free text' }));
  await run(204, 'coach: reason=not_configured upstream=none', request(curlFacts), env);
  gemini(400, { error: { message: 'bad request detail that must not be logged' } });
  await run(204, 'coach: reason=upstream_http upstream=400', request(curlFacts));
  gemini(429, {});
  await run(204, 'coach: reason=upstream_http upstream=429', request(curlFacts));
  gemini(200, candidate('MAX_TOKENS', [{ text: 'You followed Dash on' }]));
  await run(204, 'coach: reason=upstream_truncated upstream=200', request(curlFacts));
  gemini(200, { candidates: [] });
  await run(204, 'coach: reason=upstream_empty upstream=200', request(curlFacts));
  gemini(200, candidate('STOP', [{ text: 'You should see a doctor about this diagnosis. It scored 77.' }]));
  await run(204, 'coach: reason=text_rejected upstream=200', request(curlFacts));
});

test('rate limit and provider timeout are logged by code', async () => {
  const lines = spyLog();
  const ok = vi.fn<CoachProvider>(async () => text);
  const proxy = createCoachProxy({ provider: ok });
  for (let i = 0; i < C.limits.rateLimitPerIpPerHour; i++) await proxy(request(), env);
  expect((await proxy(request(), env)).status).toBe(429);
  expect(lines[lines.length - 1]).toBe('coach: reason=rate_limited upstream=none');

  vi.useFakeTimers();
  const never = vi.fn<CoachProvider>(() => new Promise(() => {}));
  const pending = createCoachProxy({ provider: never })(request(), env);
  await vi.advanceTimersByTimeAsync(C.limits.timeoutMs);
  expect((await pending).status).toBe(204);
  expect(lines[lines.length - 1]).toBe('coach: reason=upstream_timeout upstream=none');
});

test('no log line ever contains the key, the body, the prompt or the model text', async () => {
  const lines = spyLog();
  for (const method of ['error', 'warn', 'info', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
  }
  const bodies: unknown[] = [curlFacts, { ...curlFacts, extra: 'SECRET-BODY-MARKER' }, 'SECRET-BODY-MARKER'];
  const replies: Array<[number, unknown]> = [
    [200, candidate('STOP', [{ text: MODEL_TEXT }])],
    [200, candidate('STOP', [{ text: 'SECRET-MODEL-MARKER see a doctor' }])],
    [200, candidate('MAX_TOKENS', [{ text: 'SECRET-MODEL-MARKER' }])],
    [403, { error: { message: `API key ${FAKE_KEY} is invalid SECRET-MODEL-MARKER` } }],
  ];
  for (const [status, reply] of replies) {
    gemini(status, reply);
    for (const body of bodies) await createCoachProxy()(request(body), liveEnv);
  }
  // A provider that tries to smuggle text out through the trace is reduced to a fixed code.
  const hostile: CoachProvider = async (_facts, _env, _signal, trace) => {
    Object.assign(trace ?? {}, { reason: `leak ${FAKE_KEY}`, upstream: `leak ${FAKE_KEY}` });
    return undefined;
  };
  await createCoachProxy({ provider: hostile })(request(curlFacts), liveEnv);
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => { throw new Error(`network down ${FAKE_KEY}`); }));
  await createCoachProxy()(request(curlFacts), liveEnv);

  expect(lines.length).toBe(replies.length * bodies.length + 2);
  const all = lines.join('\n');
  for (const line of lines) expect(line).toMatch(LINE);
  for (const secret of [FAKE_KEY, 'SECRET-BODY-MARKER', 'SECRET-MODEL-MARKER', MODEL_TEXT, C.system, JSON.stringify(curlFacts), 'overReliance', 'Dash', 'children', 'gemini']) {
    expect(all).not.toContain(secret);
  }
});
