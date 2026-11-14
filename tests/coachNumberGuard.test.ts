// The number guard: a number may only sit next to a counting word if the facts hold that
// count. Mocks only; no network. Set COACH_GUARD_PRINT=<file> to write the golden-set table there.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { buildDebrief } from '../src/core/debrief.js';
import { validateCoachFacts, validateCoachText } from '../src/core/coach.js';
import type { CoachFacts } from '../src/core/coach.js';
import { coachConfig as C } from '../src/core/data.js';
import { checkCoachNumbers } from '../src/coach/numberGuard.js';
import { createCoachClient } from '../src/coach/coachClient.js';
import { createCoachProxy } from '../server/coach-proxy/index.js';
import type { CoachEnvironment } from '../server/coach-proxy/types.js';

/** The facts of the live shift (seed ward-128, 14 patients) that produced the bad reply. */
const live: CoachFacts = {
  v: 1, headline: 'balanced', index: 100, disagreements: 5, overRelianceRate: 0, underRelianceRate: null,
  verifyYield: null, drift: { advisor: 'Dash', category: 'breathing', noticed: true }, pressureDrop: false, patterns: [],
};
/** The live reply, exactly as shown to the player on 14 Nov. */
const LIVE_BAD = 'You showed a balanced approach across 100 cases, disagreeing with advisors 5 times. Keep monitoring the breathing category closely where Dash was noticed.';
/** The README curl body: over-reliance on Dash, 4 of 4. */
const dash: CoachFacts = {
  v: 1, headline: 'overReliance', index: 0, disagreements: 4, overRelianceRate: 100, underRelianceRate: 0, verifyYield: null,
  drift: { advisor: 'Dash', category: 'children', noticed: false }, pressureDrop: false,
  patterns: [{ kind: 'followedTooOften', advisor: 'Dash', category: 'children', count: 4, of: 4, adviceRight: 0 }],
};
const golden = (JSON.parse(readFileSync(new URL('../tools/coach-golden-facts.json', import.meta.url), 'utf8')) as { facts: CoachFacts[] }).facts;

/** What the Worker and the client both apply: the existing validator, then the number guard. */
function pipeline(text: string, facts: CoachFacts): { ok: boolean; by: 'none' | 'validateCoachText' | 'numberGuard'; reason: string } {
  const first = validateCoachText(text, facts);
  if (!first.ok) return { ok: false, by: 'validateCoachText', reason: first.reason };
  const second = checkCoachNumbers(first.text, facts);
  return second.ok ? { ok: true, by: 'none', reason: '' } : { ok: false, by: 'numberGuard', reason: second.reason };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test('the system prompt carries the number rules and both fact sets are valid', () => {
  expect(validateCoachFacts(live).ok).toBe(true);
  expect(validateCoachFacts(dash).ok).toBe(true);
  for (const phrase of ['are not counts', 'never write it, or any rate, as a number of cases', 'only if that exact number is a count in the JSON',
    'does not contain the total number of patients', 'Write a rate only as a percentage']) {
    expect(C.system).toContain(phrase);
  }
});

test('the live reply passed the old validator and is now rejected by the guard', () => {
  expect(validateCoachText(LIVE_BAD, live).ok).toBe(true);
  expect(pipeline(LIVE_BAD, live)).toEqual({ ok: false, by: 'numberGuard', reason: 'total not in facts: 100 cases' });
});

test.each<[string, string, CoachFacts]>([
  ['across 100 cases', 'Your trust was balanced across 100 cases. Keep checking Dash on breathing.', live],
  ['over 100 patients', 'You stayed balanced over 100 patients. Keep checking Dash on breathing.', live],
  ['in 100 rounds', 'You stayed balanced in 100 rounds. Keep checking Dash on breathing.', live],
  ['100 total cases', 'You handled 100 total cases well. Keep checking Dash on breathing.', live],
  ['all 100 cases', 'You were balanced in all 100 cases. Keep checking Dash on breathing.', live],
  ['100 cases, plain', 'You saw 100 cases and held your ground. Keep checking Dash on breathing.', live],
  ['index 100 as times', 'You were right 100 times. Keep checking Dash on breathing.', live],
  ['4 cases with no such count', 'You disagreed in 4 cases. Keep checking Dash on breathing.', live],
  ['5 shifts', 'You disagreed across 5 shifts. Keep checking Dash on breathing.', live],
  ['5 advisors', 'You disagreed with 5 advisors. Keep checking Dash on breathing.', live],
  ['spelled total', 'You saw fourteen patients and disagreed with the advice a few times. Keep checking Dash.', live],
  ['spelled index', 'You were balanced across a hundred cases. Keep checking Dash on breathing.', live],
  ['100 percent when no rate is 100', 'You were right 100 percent of the time. Keep checking Dash on breathing.', live],
  ['100% when no rate is 100', 'You were right 100% of the time. Keep checking Dash on breathing.', live],
  ['5 of 100', 'You disagreed 5 of 100 times. Keep checking Dash on breathing.', live],
  ['N of M reversed', 'You followed Dash 4 of 0 times on children cases. Verify Dash once next shift.', dash],
  ['rate used as a count', 'You followed Dash in 100 cases. Verify Dash once next shift.', dash],
  ['rate used as a total', 'Out of 100 calls you followed Dash 4 times. Verify Dash once next shift.', dash],
])('rejected: %s', (_name, text, facts) => {
  expect(checkCoachNumbers(text, facts).ok).toBe(false);
  expect(pipeline(text, facts).ok).toBe(false);
});

test.each<[string, string, CoachFacts]>([
  ['followed Dash 4 of 4 times', 'You followed Dash 4 of 4 times on children cases. Next shift, verify Dash once before you commit.', dash],
  ['disagreed 5 times', 'You disagreed 5 times and each time it paid off. Keep watching Dash on breathing cases.', live],
  ['5 disagreements', 'Across your 5 disagreements you held when it mattered. Keep watching Dash on breathing cases.', live],
  ['100 percent when overRelianceRate is 100', 'You followed wrong advice 100 percent of the time. Next shift, verify Dash once before you commit.', dash],
  ['100% when overRelianceRate is 100', 'You followed wrong advice 100% of the time. Next shift, verify Dash once before you commit.', dash],
  ['0 percent when overRelianceRate is 0', 'You followed wrong advice 0 percent of the time. Keep watching Dash on breathing cases.', live],
  ['the index by name', 'Your calibration index is 100, so your trust tracked reality. Keep watching Dash on breathing cases.', live],
  ['advice right 0 times', 'You followed Dash 4 times and its advice was right 0 times. Next shift, verify Dash once.', dash],
  ['one more shift', 'Your trust tracked reality this shift. Play one more shift and watch Dash on breathing cases.', live],
  ['plain, no numbers', 'Your trust tracked reality this shift. Next shift, keep watching Dash on breathing cases.', live],
])('passes: %s', (_name, text, facts) => {
  expect(checkCoachNumbers(text, facts)).toEqual({ ok: true, reason: null });
  expect(pipeline(text, facts)).toEqual({ ok: true, by: 'none', reason: '' });
});

test('guard input edge cases never throw', () => {
  expect(checkCoachNumbers(undefined, live).ok).toBe(false);
  expect(checkCoachNumbers('Plain text.', null).ok).toBe(false);
  expect(checkCoachNumbers('', live).ok).toBe(true);
  expect(checkCoachNumbers('You disagreed 5 times.', { patterns: 'nonsense', disagreements: '5' }).ok).toBe(false);
});

// --- Both places that show model text apply the guard --------------------------------------

const ORIGIN = 'https://game.example';
const env: CoachEnvironment = {
  COACH_ENABLED: 'true', COACH_ALLOWED_ORIGINS: ORIGIN, COACH_MODEL: 'gemini-3.5-flash-lite',
  COACH_API_KEY: 'AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE000',
};
const post = (facts: CoachFacts) => new Request('https://coach.example/coach', {
  method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.9' },
  body: JSON.stringify(facts),
});
const upstream = (text: string) => vi.stubGlobal('fetch', vi.fn(async () => Response.json({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
})));

test('Worker: the live bad reply now gives 204 text_rejected; a good reply still gives 200', async () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
  upstream(LIVE_BAD);
  const rejected = await createCoachProxy()(post(live), env);
  expect(rejected.status).toBe(204);
  expect(await rejected.text()).toBe('');
  expect(lines[0]).toMatch(/^coach: reason=text_rejected upstream=200 /);
  expect(lines.join('\n')).not.toContain('100 cases');

  const good = 'Your calibration index is 100 and you disagreed 5 times. Keep watching Dash on breathing cases.';
  upstream(good);
  const ok = await createCoachProxy()(post(live), env);
  expect(ok.status).toBe(200);
  expect(await ok.json()).toEqual({ text: good });
});

test('client: if a proxy ever returned the bad reply, the player gets the template', async () => {
  const debrief = buildDebrief({ entries: [] });
  const bad = createCoachClient({ proxyUrl: 'https://coach.example/coach', fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ text: LIVE_BAD })) });
  const result = await bad(live, debrief);
  expect(result.source).toBe('template');
  expect(result).toMatchObject({ reason: 'total not in facts: 100 cases' });
  expect(result.text).not.toContain('100');

  const good = 'Your calibration index is 100 and you disagreed 5 times. Keep watching Dash on breathing cases.';
  const fine = createCoachClient({ proxyUrl: 'https://coach.example/coach', fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ text: good })) });
  expect(await fine(live, buildDebrief({ entries: [] }))).toEqual({ source: 'coach', text: good });
});

// --- Golden facts with realistic replies ----------------------------------------------------

interface Reply { kind: string; text: string; expect: 'pass' | 'reject' }
function replies(f: CoachFacts): Reply[] {
  const out: Reply[] = [];
  const p = f.patterns[0];
  const who = p?.advisor ?? f.drift?.advisor ?? 'the lead advisor';
  if (f.headline === 'notEnough') {
    out.push({ kind: 'good: not enough', text: 'There is not enough data yet. Play another shift to see your pattern.', expect: 'pass' });
    out.push({ kind: 'bad: invents a total', text: 'There is not enough data yet from 14 patients. Play another shift to see your pattern.', expect: 'reject' });
    return out;
  }
  if (p) {
    const verb = p.kind === 'followedTooOften' ? 'followed' : 'overruled';
    out.push({ kind: 'good: pattern N of M', text: `You ${verb} ${p.advisor} on ${p.category} cases ${p.count} of ${p.of} times, and its advice was right ${p.adviceRight} times. Next shift, verify ${p.advisor} once before you commit.`, expect: 'pass' });
  }
  out.push({ kind: 'good: index by name', text: `Your calibration index is ${f.index} and you disagreed with the advice ${f.disagreements} times. Next shift, verify ${who} once before you commit.`, expect: 'pass' });
  if (f.overRelianceRate !== null) {
    out.push({ kind: 'good: rate as percentage', text: `You followed wrong advice ${f.overRelianceRate} percent of the time. Next shift, verify ${who} once before you commit.`, expect: 'pass' });
  }
  out.push({ kind: 'good: no numbers', text: `Your trust in ${who} did not always match how reliable it was. Next shift, verify once before you commit.`, expect: 'pass' });
  // The live failure, with this set's own numbers.
  const totals = new Set<number>([f.disagreements, ...f.patterns.map((x) => x.of)]);
  const counts = new Set<number>([...totals, ...f.patterns.flatMap((x) => [x.count, x.adviceRight])]);
  const idx = f.index as number;
  out.push({ kind: 'bad: index as "across N cases"', text: `You showed a balanced approach across ${idx} cases, disagreeing with advisors ${f.disagreements} times. Keep monitoring ${who} closely.`, expect: totals.has(idx) ? 'pass' : 'reject' });
  out.push({ kind: 'bad: index as "over N patients"', text: `Your trust held up over ${idx} patients this shift. Next shift, verify ${who} once before you commit.`, expect: totals.has(idx) ? 'pass' : 'reject' });
  out.push({ kind: 'bad: index as "N times"', text: `You made the right call ${idx} times this shift. Next shift, verify ${who} once before you commit.`, expect: counts.has(idx) ? 'pass' : 'reject' });
  out.push({ kind: 'bad: index as "in N rounds"', text: `Your trust held up in ${idx} rounds. Next shift, verify ${who} once before you commit.`, expect: 'reject' });
  // Known limit: if 14 happens to be a real count in the facts, the guard cannot tell the difference.
  out.push({ kind: 'bad: invents 14 patients', text: `You saw 14 patients and disagreed ${f.disagreements} times. Next shift, verify ${who} once before you commit.`, expect: counts.has(14) ? 'pass' : 'reject' });
  return out;
}

test('golden facts: realistic good replies pass, the bad patterns are rejected', () => {
  expect(golden).toHaveLength(30);
  const rows: string[] = [];
  const tally = { pass: 0, reject: 0, collisions: 0, byGuard: 0, byOld: 0 };
  golden.forEach((facts, i) => {
    expect(validateCoachFacts(facts).ok).toBe(true);
    for (const reply of replies(facts)) {
      const got = pipeline(reply.text, facts);
      const verdict = got.ok ? 'pass' : 'reject';
      expect(`${i + 1} ${reply.kind}: ${verdict}`).toBe(`${i + 1} ${reply.kind}: ${reply.expect}`);
      tally[verdict]++;
      if (!got.ok) tally[got.by === 'numberGuard' ? 'byGuard' : 'byOld']++;
      if (reply.kind.startsWith('bad') && got.ok) tally.collisions++;
      rows.push(`${String(i + 1).padStart(2)} ${facts.headline.padEnd(13)} ${reply.kind.padEnd(34)} ${verdict.padEnd(6)} ${got.ok ? '' : `${got.by}: ${got.reason}`}`);
    }
  });
  // The live shift's facts with the reply quoted exactly.
  const liveVerdict = pipeline(LIVE_BAD, live);
  rows.push(`LV ${live.headline.padEnd(13)} ${'bad: the live reply, exact'.padEnd(34)} ${liveVerdict.ok ? 'pass' : 'reject'} ${liveVerdict.by}: ${liveVerdict.reason}`);
  expect(liveVerdict.ok).toBe(false);
  if (process.env.COACH_GUARD_PRINT) writeFileSync(process.env.COACH_GUARD_PRINT, `${rows.join('\n')}\n${JSON.stringify(tally)}\n`);
  expect(tally.pass).toBeGreaterThan(60);
  expect(tally.byGuard).toBeGreaterThan(60);
});
