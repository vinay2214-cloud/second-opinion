import { test, assert } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { triageScore, zoneFromScore, difficultyFromScore } from '../src/core/rubric.js';
import { advise, effectiveReliability } from '../src/core/advisors.js';
import { generateCases } from '../src/core/generator.js';
import { validateCases } from '../src/core/validate.js';
import { classifyReliance, calibrationIndex, trustMap } from '../src/core/reliance.js';
import { outcomeScore, shiftScore, speedBonus, verifyYield } from '../src/core/scoring.js';
import type { AdvisorId, Category, DebriefEntry, Drift, Reliance, Zone } from '../src/core/types.js';
import { loadCases, advisorData, shiftConfig } from '../src/core/data.js';
const POOL = loadCases();

function empiricalAccuracy(advisorId: AdvisorId, category: Category, { drift = null, patientIndex = 0, truth = null, n = 4000 }: { drift?: Drift | null; patientIndex?: number; truth?: Zone | null; n?: number } = {}) {
  const fake = (i: number) => ({ id: `sim-${i}`, category, truthZone: truth ?? (['green', 'amber', 'red'] as const)[i % 3] });
  let right = 0;
  for (let i = 0; i < n; i++) right += advise({ seed: 'sim', caseObj: fake(i), advisorId, patientIndex, drift }).correct ? 1 : 0;
  return right / n;
}
function entry(over: Partial<DebriefEntry>): DebriefEntry {
  const base: Omit<DebriefEntry, 'reliance'> = { index: 0, category: 'cardiac', advisorId: 'dash', commit: 'amber', advice: 'red', final: 'red', truth: 'red', surge: false };
  const e = { ...base, ...over } as DebriefEntry;
  e.reliance = classifyReliance(e);
  return e;
}

test('rng: same seed gives same sequence, different seed differs', () => {
  const a = makeRng('x', 1), b = makeRng('x', 1), c = makeRng('y', 1);
  const sa = [a.next(), a.next(), a.next()], sb = [b.next(), b.next(), b.next()], sc = [c.next(), c.next(), c.next()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
});

test('rubric: known readings map to the right zone and difficulty', () => {
  const red = triageScore({ pulse: 118, sbp: 92, spo2: 94, temp: 36.9 }, ['chest_pressure'], 'adult');
  assert.strictEqual(red.score, 2 + 2 + 1 + 0 + 2); // pulse 2, sbp 2, spo2 1, flag 2 = 7
  assert.strictEqual(red.zone, 'red');
  const green = triageScore({ pulse: 72, sbp: 120, spo2: 98, temp: 36.8 }, [], 'adult');
  assert.deepEqual([green.score, green.zone, green.difficulty], [0, 'green', 1]);
  assert.strictEqual(zoneFromScore(2), 'green');
  assert.strictEqual(zoneFromScore(3), 'amber');
  assert.strictEqual(zoneFromScore(5), 'amber');
  assert.strictEqual(zoneFromScore(6), 'red');
  assert.deepEqual([2, 3, 5, 6].map(difficultyFromScore), [3, 3, 3, 3]);
  assert.deepEqual([1, 4, 7].map(difficultyFromScore), [2, 2, 2]);
  assert.deepEqual([0, 8].map(difficultyFromScore), [1, 1]);
});

test('rubric: child tables differ from adult tables', () => {
  const v = { pulse: 125, sbp: 100, spo2: 98, temp: 36.8 };
  assert.strictEqual(triageScore(v, [], 'adult').score, 4); // pulse 111-130 => 2, sbp 91-100 => 2
  assert.strictEqual(triageScore(v, [], 'child').score, 1); // pulse 121-140 => 1, sbp >= 90 => 0
});

test('reliance: all branches', () => {
  const t = 'red';
  assert.strictEqual(classifyReliance({ commit: 'red', advice: 'red', final: 'red', truth: t }), 'agree');
  assert.strictEqual(classifyReliance({ commit: 'amber', advice: 'red', final: 'red', truth: t }), 'switch-right');
  assert.strictEqual(classifyReliance({ commit: 'red', advice: 'amber', final: 'amber', truth: t }), 'switch-wrong');
  assert.strictEqual(classifyReliance({ commit: 'red', advice: 'amber', final: 'red', truth: t }), 'hold-right');
  assert.strictEqual(classifyReliance({ commit: 'amber', advice: 'red', final: 'amber', truth: t }), 'hold-wrong');
  assert.strictEqual(classifyReliance({ commit: 'green', advice: 'amber', final: 'amber', truth: t }), 'both-wrong');
  assert.strictEqual(classifyReliance({ commit: 'green', advice: 'amber', final: 'green', truth: t }), 'both-wrong');
  assert.strictEqual(classifyReliance({ commit: 'green', advice: 'amber', final: 'red', truth: t }), 'other');
});

test('calibration index: math, exclusions, rates and minimum disagreements', () => {
  const mk = (reliance: Reliance) => ({ reliance });
  const entries = [...Array(3).fill('switch-right'), ...Array(2).fill('hold-right'), 'switch-wrong', 'hold-wrong', 'both-wrong', 'agree', 'other'].map((r) => mk(r as Reliance));
  const r = calibrationIndex(entries);
  assert.strictEqual(r.scorable, 7);
  assert.strictEqual(r.index, Math.round((5 / 7) * 100));
  assert.strictEqual(r.overRelianceRate, 1 / 3); // SW / (SW + HR) = 1/(1+2)
  assert.strictEqual(r.underRelianceRate, 1 / 4); // HW / (HW + SR) = 1/(1+3)
  assert.strictEqual(calibrationIndex([mk('switch-right'), mk('hold-right'), mk('agree')]).index, null); // < 4 disagreements
});

test('scoring: outcome, speed bonus, missed window, restraint bonus', () => {
  assert.strictEqual(outcomeScore({ final: 'red', truth: 'red', msToCommit: 5000 }), 13);
  assert.strictEqual(outcomeScore({ final: 'red', truth: 'red', msToCommit: 12000 }), 12);
  assert.strictEqual(outcomeScore({ final: 'red', truth: 'red', msToCommit: 20000 }), 11);
  assert.strictEqual(outcomeScore({ final: 'red', truth: 'red', msToCommit: 40000 }), 10);
  assert.strictEqual(outcomeScore({ final: 'amber', truth: 'red', msToCommit: 3000 }), -5);
  assert.strictEqual(outcomeScore({ final: 'green', truth: 'red', msToCommit: 3000 }), -15);
  assert.strictEqual(outcomeScore({ final: 'amber', truth: 'amber', missed: true }), 10 - 3);
  assert.strictEqual(speedBonus(null), 0);
  const s = shiftScore([{ final: 'red', truth: 'red', msToCommit: 5000 }, { final: 'amber', truth: 'red', msToCommit: 3000 }], 2);
  assert.deepEqual(s, { outcome: 8, restraint: 2, total: 10 });
  assert.strictEqual(verifyYield([]), null);
  assert.strictEqual(verifyYield([{ revealedDisagreement: true }, {}, { fixedWrongCall: true }, {}]), 0.5);
});

test('advisors: deterministic per (seed, case, advisor)', () => {
  const c = POOL[0];
  const a = advise({ seed: 's1', caseObj: c, advisorId: 'dash' });
  const b = advise({ seed: 's1', caseObj: c, advisorId: 'dash' });
  assert.deepEqual(a, b);
});

test('advisors: empirical accuracy matches hidden reliability', () => {
  assert.ok(Math.abs(empiricalAccuracy('dash', 'cardiac', { truth: 'amber' }) - 0.92) < 0.03);
  assert.ok(Math.abs(empiricalAccuracy('dash', 'children', { truth: 'amber' }) - 0.55) < 0.03);
  assert.ok(Math.abs(empiricalAccuracy('ledger', 'cardiac', { truth: 'amber' }) - 0.96) < 0.03);
  assert.ok(Math.abs(empiricalAccuracy('ledger', 'injury', { truth: 'amber' }) - 0.55) < 0.03);
  assert.ok(Math.abs(empiricalAccuracy('orator', 'breathing', { truth: 'amber' }) - 0.55) < 0.03);
});

test('advisors: Sage over-calls but rarely misses red', () => {
  assert.ok(empiricalAccuracy('sage', 'cardiac', { truth: 'red' }) > 0.94);
  // when Sage is wrong about a green or amber case it upgrades
  let upgrades = 0, wrong = 0;
  for (let i = 0; i < 3000; i++) {
    const c = { id: `u-${i}`, category: 'injury', truthZone: 'green' } as const;
    const r = advise({ seed: 'up', caseObj: c, advisorId: 'sage' });
    if (!r.correct) { wrong++; if (r.call === 'amber') upgrades++; }
  }
  assert.ok(wrong > 200);
  assert.strictEqual(upgrades, wrong);
});

test('advisors: drift lowers reliability only after atIndex and only for the target', () => {
  const drift: Drift = { advisorId: 'dash', category: 'cardiac', delta: -0.35, atIndex: 8 };
  assert.strictEqual(effectiveReliability('dash', 'cardiac', 'amber', 7, drift), 0.92);
  assert.ok(Math.abs(effectiveReliability('dash', 'cardiac', 'amber', 8, drift) - 0.57) < 1e-9);
  assert.strictEqual(effectiveReliability('dash', 'injury', 'amber', 9, drift), 0.88);
  assert.strictEqual(effectiveReliability('sage', 'cardiac', 'amber', 9, drift), 0.85);
  assert.ok(empiricalAccuracy('dash', 'cardiac', { drift, patientIndex: 9, truth: 'amber' }) < 0.65);
});

test('advisors: Echo mirrors the player commit', () => {
  const r = advise({ seed: 's', caseObj: POOL[0], advisorId: 'echo', playerCommit: 'green' });
  assert.strictEqual(r.call, 'green');
});

test('generator: seed pool is valid and re-generation is deterministic', () => {
  assert.deepEqual(validateCases(POOL), []);
  assert.deepEqual(generateCases({ seed: 'second-opinion-v1' }), POOL);
  const other = generateCases({ seed: 'another-seed' });
  assert.deepEqual(validateCases(other), []);
  assert.notDeepEqual(other, POOL);
});

test('validator: catches a tampered truth zone and an implausible complaint', () => {
  const bad = structuredClone(POOL);
  bad[0].truthZone = bad[0].truthZone === 'red' ? 'green' : 'red';
  assert.ok(validateCases(bad).some((p) => p.includes('truthZone')));
  const hot = structuredClone(POOL);
  const i = hot.findIndex((c) => c.complaint.startsWith('Fever and shaking'));
  hot[i].vitals.temp = 36.5;
  assert.ok(validateCases(hot).length > 0);
});

test('trust map: follow rate and advice accuracy per advisor and category', () => {
  const entries = [
    entry({ advisorId: 'ledger', category: 'injury', commit: 'red', advice: 'amber', final: 'amber', truth: 'red' }),
    entry({ advisorId: 'ledger', category: 'injury', commit: 'red', advice: 'amber', final: 'red', truth: 'red' }),
  ];
  const [row] = trustMap(entries);
  assert.strictEqual(row.followRate, 0.5);
  assert.strictEqual(row.adviceAccuracy, 0);
});
