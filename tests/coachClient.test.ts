import { afterEach, expect, test, vi } from 'vitest';
import { buildDebrief } from '../src/core/debrief.js';
import { buildCoachFacts, coachFallback } from '../src/core/coach.js';
import { createCoachClient, askCoach } from '../src/coach/coachClient.js';
import { coachProxyUrl, COACH_AVAILABLE } from '../src/coach/config.js';
import { coachConfig as C } from '../src/core/data.js';

const url = 'https://coach.example/coach';
const debrief = () => buildDebrief({ entries: [] });
const facts = buildCoachFacts({ debrief: debrief(), entries: [] });
const text = 'There is not enough data yet. Play another shift to see your pattern.';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

test('client sends only facts, once on demand, and caches concurrent presses for the same shift', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ text }));
  const client = createCoachClient({ proxyUrl: url, fetcher });
  const summary = debrief();
  expect(fetcher).not.toHaveBeenCalled();
  const results = await Promise.all([client(facts, summary), client(facts, summary)]);
  expect(results).toEqual([{ source: 'coach', text }, { source: 'coach', text }]);
  await client(facts, summary);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [target, init] = fetcher.mock.calls[0];
  expect(target).toBe(url);
  expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' });
  expect(JSON.parse(String(init?.body))).toEqual(facts);
  expect(init?.signal).toBeInstanceOf(AbortSignal);
  await client(facts, debrief());
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test.each([
  ['500', () => Promise.resolve(new Response(null, { status: 500 }))],
  ['malformed JSON', () => Promise.resolve(new Response('{'))],
  ['offline', () => Promise.reject(new TypeError('offline'))],
  ['204', () => Promise.resolve(new Response(null, { status: 204 }))],
  ['invalid text', () => Promise.resolve(Response.json({ text: 'Consider treatment for this pattern.' }))],
  ['missing text', () => Promise.resolve(Response.json({}))],
  ['null body', () => Promise.resolve(Response.json(null))],
  ['synchronous fetch error', () => { throw new Error('network unavailable'); }],
] as const)('client failure %s returns the template within 3.2 s and does not retry', async (_name, response) => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(response);
  const client = createCoachClient({ proxyUrl: url, fetcher });
  const summary = debrief();
  const start = performance.now();
  expect(await client(facts, summary)).toMatchObject({ source: 'template', text: coachFallback(summary) });
  expect(performance.now() - start).toBeLessThan(3200);
  await client(facts, summary);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('client falls back at 3000 ms for a slow response and aborts the request', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() =>
    new Promise((resolve) => setTimeout(() => resolve(Response.json({ text })), 4000)));
  const summary = debrief();
  const pending = createCoachClient({ proxyUrl: url, fetcher })(facts, summary);
  await vi.advanceTimersByTimeAsync(C.limits.timeoutMs);
  expect(await pending).toMatchObject({ source: 'template', text: coachFallback(summary) });
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('wall-clock deadline covers hung fetch AND hung response body, even when abort is ignored', async () => {
  const summary = debrief();
  const hanging = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  const body = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream()));
  const start = performance.now();
  const results = await Promise.all([
    createCoachClient({ proxyUrl: url, fetcher: hanging })(facts, summary),
    createCoachClient({ proxyUrl: url, fetcher: body })(facts, summary),
  ]);
  const elapsed = performance.now() - start;
  for (const result of results) expect(result).toMatchObject({ source: 'template', text: coachFallback(summary) });
  expect(elapsed).toBeLessThan(3200);
  expect(hanging.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(body.mock.calls[0][1]?.signal?.aborted).toBe(true);
  console.info('Coach timeout wall clock: ' + Math.round(elapsed) + ' ms (<3200 ms); fetch and body returned template.');
}, 5000);

test('invalid facts, cyclic facts and invalid configuration never send a request or throw', async () => {
  const fetcher = vi.fn<typeof fetch>();
  const cycle: Record<string, unknown> = { ...facts };
  cycle.self = cycle;
  const client = createCoachClient({ proxyUrl: url, fetcher });
  for (const value of [null, cycle, { ...facts, note: 'free text' }]) {
    expect((await client(value, debrief())).source).toBe('template');
  }
  for (const proxyUrl of ['', 'javascript:alert(1)', 'http://remote.example/coach', 'https://user:pass@example.com/coach']) {
    expect((await createCoachClient({ proxyUrl, fetcher })(facts, debrief())).source).toBe('template');
  }
  expect(fetcher).not.toHaveBeenCalled();
});

test('public build config enables the client URL; an empty value disables it without network', async () => {
  vi.stubEnv('VITE_COACH_PROXY_URL', url);
  const enabled = await import('../src/coach/config.js');
  expect(enabled.COACH_PROXY_URL).toBe(url);
  expect(enabled.COACH_AVAILABLE).toBe(true);
  vi.resetModules();
  vi.stubEnv('VITE_COACH_PROXY_URL', '');
  const disabled = await import('../src/coach/config.js');
  expect(disabled.COACH_AVAILABLE).toBe(false);
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  const client = await import('../src/coach/coachClient.js');
  expect((await client.askCoach(facts, debrief())).source).toBe('template');
  expect(fetcher).not.toHaveBeenCalled();
  expect(coachProxyUrl('http://localhost:8787/coach')).toBe('http://localhost:8787/coach');
  expect(typeof COACH_AVAILABLE).toBe('boolean');
  expect(typeof askCoach).toBe('function');
});
