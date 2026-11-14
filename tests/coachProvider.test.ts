// Provider and Worker tests against a fetch that behaves like the Cloudflare Workers
// runtime where it differs from Node: it builds real Headers and Request objects (they
// throw on invalid header values) and it refuses redirect: 'error', as workerd does.
// No network: every upstream call is this mock. The key below is fake.
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { validateCoachFacts, validateCoachText } from '../src/core/coach.js';
import type { CoachFacts } from '../src/core/coach.js';
import { coachConfig as C } from '../src/core/data.js';
import worker, { createCoachProxy } from '../server/coach-proxy/index.js';
import { callGemini, keyShape, usableKey } from '../server/coach-proxy/provider.js';
import { COACH_REASONS, COACH_STAGES } from '../server/coach-proxy/types.js';
import type { CoachEnvironment, CoachTrace } from '../server/coach-proxy/types.js';

const FAKE_KEY = 'AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE000'; // 39 characters, like a real key's shape
const ORIGIN = 'https://vinay2214-cloud.github.io';
const MODEL = 'gemini-3.5-flash-lite';
const GOOD_TEXT = 'You followed Dash on children cases 4 of 4 times. Next shift, verify Dash once before you commit.';
const golden = (JSON.parse(readFileSync(new URL('../tools/coach-golden-facts.json', import.meta.url), 'utf8')) as { facts: CoachFacts[] }).facts;
const facts = golden.find((f) => f.headline === 'overReliance' && f.patterns.length > 0 && f.patterns[0].advisor === 'Dash'
  && f.patterns[0].category === 'children' && f.patterns[0].count === 4 && f.patterns[0].of === 4) as CoachFacts;
// Explicit arity so that passing undefined really means "not set".
function env(...args: [] | [key: string | undefined] | [key: string | undefined, model: string | undefined]): CoachEnvironment {
  return {
    COACH_ENABLED: 'true', COACH_ALLOWED_ORIGINS: ORIGIN,
    COACH_MODEL: args.length > 1 ? args[1] : MODEL, COACH_API_KEY: args.length > 0 ? args[0] : FAKE_KEY,
  };
}
const reply = (finishReason: string, text: string) => ({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });
const LINE = new RegExp(
  `^coach: reason=(${COACH_REASONS.join('|')}) upstream=(none|[1-5]\\d\\d) stage=(none|${COACH_STAGES.join('|')})`
  + ' err=(none|[A-Za-z][A-Za-z0-9]{0,39}) key_len_ok=(true|false) key_prefix_ok=(true|false) key_charset_ok=(true|false)$',
);

interface Sent { url: string; method: string; key: string | null; contentType: string | null; body: string; redirect: string }
/** A fetch with the Workers behaviours that matter here. `respond` may throw. */
function workersFetch(respond: () => Response | Promise<Response>) {
  const sent: Sent[] = [];
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (init?.redirect === 'error') {
      throw new TypeError('Invalid redirect value, must be one of "follow" or "manual" ("error" won\'t be implemented).');
    }
    if (init?.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
    const request = new Request(input, init); // throws TypeError on an invalid header value, as Workers does
    sent.push({
      url: request.url, method: request.method, key: request.headers.get('x-goog-api-key'),
      contentType: request.headers.get('content-type'), body: await request.text(), redirect: request.redirect,
    });
    return respond();
  });
  vi.stubGlobal('fetch', mock);
  return { sent, mock };
}
function spyLog() {
  const lines: string[] = [];
  for (const method of ['log', 'error', 'warn', 'info', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
  }
  return lines;
}
function post(body: unknown = facts) {
  return new Request('https://second-opinion-coach.example.workers.dev/coach', {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.7' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const live = () => new AbortController().signal;
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test('the golden facts used here are the README curl body and pass the schema', () => {
  expect(facts).toBeDefined();
  expect(validateCoachFacts(facts)).toEqual({ ok: true, reason: null });
});

test('a valid key succeeds, and the request is the documented shape with redirect manual', async () => {
  const { sent } = workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
  const trace: CoachTrace = {};
  expect(await callGemini(facts, env(), live(), trace)).toBe(GOOD_TEXT);
  expect(trace).toEqual({ upstream: 200 });
  expect(sent).toHaveLength(1);
  expect(sent[0].url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`);
  expect(sent[0].method).toBe('POST');
  expect(sent[0].key).toBe(FAKE_KEY);
  expect(sent[0].contentType).toBe('application/json');
  expect(sent[0].redirect).toBe('manual');
  const body = JSON.parse(sent[0].body) as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(['contents', 'generationConfig', 'systemInstruction']);
  expect(body.generationConfig).toEqual({
    maxOutputTokens: C.limits.maxOutputTokens, candidateCount: 1, thinkingConfig: { thinkingLevel: 'MINIMAL' },
  });
});

test.each([`${FAKE_KEY}\n`, `${FAKE_KEY}\r\n`, `  ${FAKE_KEY}\t`, `\n${FAKE_KEY} \n`])(
  'a key with surrounding whitespace is trimmed and the trimmed value is what is sent (case %#)', async (raw) => {
    const { sent } = workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
    expect(await callGemini(facts, env(raw), live(), {})).toBe(GOOD_TEXT);
    expect(sent[0].key).toBe(FAKE_KEY);
  });

test.each([
  ['internal space', 'AIzaFAKEFAKE FAKEFAKEFAKEFAKEFAKEFAKE00'],
  ['double quotes', `"${FAKE_KEY}"`],
  ['single quotes', `'${FAKE_KEY}'`],
  ['internal CR', 'AIzaFAKEFAKE\rFAKEFAKEFAKEFAKEFAKEFAKE00'],
  ['internal newline', 'AIzaFAKEFAKE\nFAKEFAKEFAKEFAKEFAKEFAKE00'],
  ['asterisks', 'AIza**********************************'],
  ['non-ASCII', 'AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKÉ0'],
  ['non-Latin-1', 'AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAK☃'],
  ['NUL', 'AIzaFAKEFAKE\u0000FAKEFAKEFAKEFAKEFAKEFAKE0'],
  ['placeholder', '<paste the key>'],
  ['empty', ''],
  ['only whitespace', ' \n\t'],
  ['undefined', undefined],
])('a key with %s is rejected as not_configured and no request is sent', async (_name, raw) => {
  const { mock } = workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
  const lines = spyLog();
  const trace: CoachTrace = {};
  expect(await callGemini(facts, env(raw), live(), trace)).toBeUndefined();
  expect(trace).toEqual({ reason: 'not_configured' });
  expect(usableKey(raw)).toBeUndefined();
  const response = await createCoachProxy()(post(), env(raw));
  expect(response.status).toBe(204);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(/^coach: reason=not_configured upstream=none stage=none err=none key_len_ok=/);
  expect(mock).not.toHaveBeenCalled();
});

test('key shape flags are booleans computed from the trimmed key', () => {
  expect(keyShape(FAKE_KEY)).toEqual({ len: true, prefix: true, charset: true });
  expect(keyShape(`${FAKE_KEY}\n`)).toEqual({ len: true, prefix: true, charset: true });
  expect(keyShape(`"${FAKE_KEY}"`)).toEqual({ len: false, prefix: false, charset: false });
  expect(keyShape('AIzaSHORT')).toEqual({ len: false, prefix: true, charset: true });
  expect(keyShape(undefined)).toEqual({ len: false, prefix: false, charset: false });
});

test.each([[undefined], [''], ['  '], ['models/'], ['bad model'], ['../x'], ['a/b'], ['m?key=1']])(
  'model %j is caught before any request', async (model) => {
    const { mock } = workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
    const trace: CoachTrace = {};
    expect(await callGemini(facts, env(FAKE_KEY, model), live(), trace)).toBeUndefined();
    expect(trace.reason).toBe('not_configured');
    expect(mock).not.toHaveBeenCalled();
  });

test('an already-aborted signal sends nothing and does not throw', async () => {
  const { mock } = workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
  const controller = new AbortController();
  controller.abort();
  const trace: CoachTrace = {};
  expect(await callGemini(facts, env(), controller.signal, trace)).toBeUndefined();
  expect(trace).toEqual({});
  expect(mock).not.toHaveBeenCalled();
});

test('a fetch that throws is logged as stage=fetch with only the error class', async () => {
  workersFetch(() => { throw new TypeError(`connect failed for key ${FAKE_KEY}`); });
  const lines = spyLog();
  const response = await createCoachProxy()(post(), env());
  expect(response.status).toBe(204);
  expect(lines).toEqual([
    'coach: reason=upstream_http upstream=none stage=fetch err=TypeError key_len_ok=true key_prefix_ok=true key_charset_ok=true',
  ]);
});

test('regression: redirect "error" is what the Workers-like fetch refuses; the provider no longer sends it', async () => {
  const { mock } = workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
  await expect(fetch('https://generativelanguage.googleapis.com/', { redirect: 'error' })).rejects.toBeInstanceOf(TypeError);
  mock.mockClear();
  expect(await callGemini(facts, env(), live(), {})).toBe(GOOD_TEXT);
  expect(mock.mock.calls[0][1]?.redirect).toBe('manual');
});

test('a redirect reply is not followed and is logged by its status', async () => {
  const { sent } = workersFetch(() => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example/' } }));
  const lines = spyLog();
  expect((await createCoachProxy()(post(), env())).status).toBe(204);
  expect(sent).toHaveLength(1);
  expect(lines[0]).toMatch(/^coach: reason=upstream_http upstream=302 stage=none err=none /);
});

test.each([400, 403, 404, 429, 500, 503])('non-2xx %i is logged with the numeric status', async (status) => {
  workersFetch(() => Response.json({ error: { message: `detail with ${FAKE_KEY}` } }, { status }));
  const lines = spyLog();
  expect((await createCoachProxy()(post(), env())).status).toBe(204);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(new RegExp(`^coach: reason=upstream_http upstream=${status} stage=none err=none `));
});

test('a reply that is not JSON is logged as stage=read_body', async () => {
  workersFetch(() => new Response('<html>MODEL-OUTPUT-MARKER', { status: 200 }));
  const lines = spyLog();
  expect((await createCoachProxy()(post(), env())).status).toBe(204);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(/^coach: reason=upstream_empty upstream=200 stage=read_body err=SyntaxError /);
});

test('the 3 s timeout still answers 204 with upstream_timeout and aborts the upstream call', async () => {
  vi.useFakeTimers();
  let aborted = false;
  vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); });
  })));
  const lines = spyLog();
  const pending = createCoachProxy()(post(), env());
  await vi.advanceTimersByTimeAsync(C.limits.timeoutMs);
  expect((await pending).status).toBe(204);
  await vi.advanceTimersByTimeAsync(10);
  expect(aborted).toBe(true);
  expect(lines).toEqual([
    'coach: reason=upstream_timeout upstream=none stage=none err=none key_len_ok=true key_prefix_ok=true key_charset_ok=true',
  ]);
});

test('end to end through the exported Worker handler: 200 with valid text, then 204 when the upstream throws', async () => {
  const lines = spyLog();
  workersFetch(() => Response.json(reply('STOP', GOOD_TEXT)));
  const ok = await worker.fetch(post(), env());
  expect(ok.status).toBe(200);
  expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  const payload = await ok.json() as { text: string };
  expect(validateCoachText(payload.text, facts)).toEqual({ ok: true, reason: null, text: GOOD_TEXT });
  expect(lines[lines.length - 1]).toBe(
    'coach: reason=ok upstream=200 stage=none err=none key_len_ok=true key_prefix_ok=true key_charset_ok=true',
  );

  workersFetch(() => { throw new TypeError('network unreachable'); });
  const failed = await worker.fetch(post(), env());
  expect(failed.status).toBe(204);
  expect(await failed.text()).toBe('');
  expect(lines[lines.length - 1]).toMatch(/^coach: reason=upstream_http upstream=none stage=fetch err=TypeError /);
});

test('leak test: no log line holds the key, the body, the prompt, the model output or an error message', async () => {
  const lines = spyLog();
  const BODY_MARKER = 'BODY-MARKER-7f3a';
  const MODEL_MARKER = 'MODEL-OUTPUT-MARKER-91c2';
  const ERROR_MARKER = `ERROR-MESSAGE-MARKER ${FAKE_KEY}`;
  class LeakyError extends Error {}
  const upstreams: Array<() => Response> = [
    () => Response.json(reply('STOP', GOOD_TEXT)),
    () => Response.json(reply('STOP', `${MODEL_MARKER} see a doctor`)),
    () => Response.json(reply('MAX_TOKENS', MODEL_MARKER)),
    () => Response.json({ error: { message: ERROR_MARKER } }, { status: 400 }),
    () => new Response(`${MODEL_MARKER} not json`, { status: 200 }),
    () => { throw new TypeError(ERROR_MARKER); },
    () => { throw new LeakyError(ERROR_MARKER); },
    () => { throw ERROR_MARKER; },
    () => { throw Object.assign(new Error(ERROR_MARKER), { constructor: { name: ERROR_MARKER } }); },
  ];
  const bodies: unknown[] = [facts, { ...facts, extra: BODY_MARKER }, BODY_MARKER, `{"broken": "${BODY_MARKER}"`];
  const keys = [FAKE_KEY, `${FAKE_KEY}\n`, `"${FAKE_KEY}"`, `${FAKE_KEY} ${FAKE_KEY}`];
  let requests = 0;
  for (const upstream of upstreams) {
    workersFetch(upstream);
    for (const body of bodies) {
      for (const key of keys) {
        await createCoachProxy()(post(body), env(key));
        requests++;
      }
    }
  }
  expect(lines).toHaveLength(requests);
  for (const line of lines) expect(line).toMatch(LINE);
  const all = lines.join('\n');
  for (const secret of [FAKE_KEY, FAKE_KEY.slice(0, 12), FAKE_KEY.slice(-8), BODY_MARKER, MODEL_MARKER, 'ERROR-MESSAGE-MARKER',
    GOOD_TEXT, C.system, JSON.stringify(facts), 'overReliance', 'Dash', 'children', 'gemini', 'googleapis']) {
    expect(all).not.toContain(secret);
  }
  // The outcomes above were really exercised, not short-circuited.
  for (const expected of ['reason=ok upstream=200', 'reason=text_rejected', 'reason=upstream_truncated', 'upstream=400',
    'stage=read_body err=SyntaxError', 'stage=fetch err=TypeError', 'stage=fetch err=LeakyError', 'stage=fetch err=unknown',
    'reason=not_configured', 'reason=bad_facts', 'reason=bad_json']) {
    expect(all).toContain(expected);
  }
});
