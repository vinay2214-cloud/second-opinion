import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRng, triageScore, zoneFromScore, difficultyFromScore, classifyReliance, calibrationIndex, trustMap,
  outcomeScore, shiftScore, speedBonus, verifyYield, advise, effectiveReliability, generateCases, validateCases,
  buildShift, dailySeed, buildDebrief,
} from '../src/index.js';
import { loadCases, advisorData, shiftConfig } from '../src/data.js';

const POOL = loadCases();

test('rng: same seed gives same sequence, different seed differs', () => {
  const a = makeRng('x', 1), b = makeRng('x', 1), c = makeRng('y', 1);
  const sa = [a.next(), a.next(), a.next()], sb = [b.next(), b.next(), b.next()], sc = [c.next(), c.next(), c.next()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
});

test('rubric: known readings map to the right zone and difficulty', () => {
  const red = triageScore({ pulse: 118, sbp: 92, spo2: 94, temp: 36.9 }, ['chest_pressure'], 'adult');
  assert.equal(red.score, 2 + 2 + 1 + 0 + 2); // pulse 2, sbp 2, spo2 1, flag 2 = 7
  assert.equal(red.zone, 'red');
  const green = triageScore({ pulse: 72, sbp: 120, spo2: 98, temp: 36.8 }, [], 'adult');
  assert.deepEqual([green.score, green.zone, green.difficulty], [0, 'green', 1]);
  assert.equal(zoneFromScore(2), 'green');
  assert.equal(zoneFromScore(3), 'amber');
  assert.equal(zoneFromScore(5), 'amber');
  assert.equal(zoneFromScore(6), 'red');
  assert.deepEqual([2, 3, 5, 6].map(difficultyFromScore), [3, 3, 3, 3]);
  assert.deepEqual([1, 4, 7].map(difficultyFromScore), [2, 2, 2]);
  assert.deepEqual([0, 8].map(difficultyFromScore), [1, 1]);
});

test('rubric: child tables differ from adult tables', () => {
  const v = { pulse: 125, sbp: 100, spo2: 98, temp: 36.8 };
  assert.equal(triageScore(v, [], 'adult').score, 4); // pulse 111-130 => 2, sbp 91-100 => 2
  assert.equal(triageScore(v, [], 'child').score, 1); // pulse 121-140 => 1, sbp >= 90 => 0
});

test('reliance: all branches', () => {
  const t = 'red';
  assert.equal(classifyReliance({ commit: 'red', advice: 'red', final: 'red', truth: t }), 'agree');
  assert.equal(classifyReliance({ commit: 'amber', advice: 'red', final: 'red', truth: t }), 'switch-right');
  assert.equal(classifyReliance({ commit: 'red', advice: 'amber', final: 'amber', truth: t }), 'switch-wrong');
  assert.equal(classifyReliance({ commit: 'red', advice: 'amber', final: 'red', truth: t }), 'hold-right');
  assert.equal(classifyReliance({ commit: 'amber', advice: 'red', final: 'amber', truth: t }), 'hold-wrong');
  assert.equal(classifyReliance({ commit: 'green', advice: 'amber', final: 'amber', truth: t }), 'both-wrong');
  assert.equal(classifyReliance({ commit: 'green', advice: 'amber', final: 'green', truth: t }), 'both-wrong');
  assert.equal(classifyReliance({ commit: 'green', advice: 'amber', final: 'red', truth: t }), 'other');
});

test('calibration index: math, exclusions, rates and minimum disagreements', () => {
  const mk = (reliance) => ({ reliance });
  const entries = [...Array(3).fill('switch-right'), ...Array(2).fill('hold-right'), 'switch-wrong', 'hold-wrong', 'both-wrong', 'agree', 'other'].map(mk);
  const r = calibrationIndex(entries);
  assert.equal(r.scorable, 7);
  assert.equal(r.index, Math.round((5 / 7) * 100));
  assert.equal(r.overRelianceRate, 1 / 3); // SW / (SW + HR) = 1/(1+2)
  assert.equal(r.underRelianceRate, 1 / 4); // HW / (HW + SR) = 1/(1+3)
  assert.equal(calibrationIndex([mk('switch-right'), mk('hold-right'), mk('agree')]).index, null); // < 4 disagreements
});

test('scoring: outcome, speed bonus, missed window, restraint bonus', () => {
  assert.equal(outcomeScore({ final: 'red', truth: 'red', msToCommit: 5000 }), 13);
  assert.equal(outcomeScore({ final: 'red', truth: 'red', msToCommit: 12000 }), 12);
  assert.equal(outcomeScore({ final: 'red', truth: 'red', msToCommit: 20000 }), 11);
  assert.equal(outcomeScore({ final: 'red', truth: 'red', msToCommit: 40000 }), 10);
  assert.equal(outcomeScore({ final: 'amber', truth: 'red', msToCommit: 3000 }), -5);
  assert.equal(outcomeScore({ final: 'green', truth: 'red', msToCommit: 3000 }), -15);
  assert.equal(outcomeScore({ final: 'amber', truth: 'amber', missed: true }), 10 - 3);
  assert.equal(speedBonus(null), 0);
  const s = shiftScore([{ final: 'red', truth: 'red', msToCommit: 5000 }, { final: 'amber', truth: 'red', msToCommit: 3000 }], 2);
  assert.deepEqual(s, { outcome: 8, restraint: 2, total: 10 });
  assert.equal(verifyYield([]), null);
  assert.equal(verifyYield([{ revealedDisagreement: true }, {}, { fixedWrongCall: true }, {}]), 0.5);
});

test('advisors: deterministic per (seed, case, advisor)', () => {
  const c = POOL[0];
  const a = advise({ seed: 's1', caseObj: c, advisorId: 'dash' });
  const b = advise({ seed: 's1', caseObj: c, advisorId: 'dash' });
  assert.deepEqual(a, b);
});

function empiricalAccuracy(advisorId, category, { drift = null, patientIndex = 0, truth = null, n = 4000 } = {}) {
  const fake = (i) => ({ id: `sim-${i}`, category, truthZone: truth ?? ['green', 'amber', 'red'][i % 3] });
  let right = 0;
  for (let i = 0; i < n; i++) right += advise({ seed: 'sim', caseObj: fake(i), advisorId, patientIndex, drift }).correct ? 1 : 0;
  return right / n;
}

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
    const c = { id: `u-${i}`, category: 'injury', truthZone: 'green' };
    const r = advise({ seed: 'up', caseObj: c, advisorId: 'sage' });
    if (!r.correct) { wrong++; if (r.call === 'amber') upgrades++; }
  }
  assert.ok(wrong > 200);
  assert.equal(upgrades, wrong);
});

test('advisors: drift lowers reliability only after atIndex and only for the target', () => {
  const drift = { advisorId: 'dash', category: 'cardiac', delta: -0.35, atIndex: 8 };
  assert.equal(effectiveReliability('dash', 'cardiac', 'amber', 7, drift), 0.92);
  assert.ok(Math.abs(effectiveReliability('dash', 'cardiac', 'amber', 8, drift) - 0.57) < 1e-9);
  assert.equal(effectiveReliability('dash', 'injury', 'amber', 9, drift), 0.88);
  assert.equal(effectiveReliability('sage', 'cardiac', 'amber', 9, drift), 0.85);
  assert.ok(empiricalAccuracy('dash', 'cardiac', { drift, patientIndex: 9, truth: 'amber' }) < 0.65);
});

test('advisors: Echo mirrors the player commit', () => {
  const r = advise({ seed: 's', caseObj: POOL[0], advisorId: 'echo', playerCommit: 'green' });
  assert.equal(r.call, 'green');
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

test('shift director: module 3 shift shape, quotas, determinism, timing', () => {
  const a = buildShift({ seed: 'daily-2026-11-18', cases: POOL, module: 'module3' });
  const b = buildShift({ seed: 'daily-2026-11-18', cases: POOL, module: 'module3' });
  assert.deepEqual(a, b);
  assert.equal(a.patients.length, 14);
  const zones = a.patients.reduce((m, p) => ({ ...m, [p.case.truthZone]: (m[p.case.truthZone] ?? 0) + 1 }), {});
  assert.deepEqual(zones, { green: 4, amber: 6, red: 4 });
  assert.ok(new Set(a.patients.map((p) => p.case.category)).size >= 4);
  assert.equal(new Set(a.patients.map((p) => p.caseId)).size, 14);
  for (let i = 1; i < 14; i++) assert.ok(a.patients[i].arrivalSec > a.patients[i - 1].arrivalSec);
  assert.ok(a.estimatedEndSec <= a.hardCapSeconds, `estimated end ${a.estimatedEndSec}s must fit the hard cap`);
  assert.ok(a.estimatedEndSec >= 360, 'shift should feel like roughly 6 to 8 minutes');
  assert.ok(a.patients.slice(0, 3).every((p) => p.case.difficulty <= 2), 'ramp: no borderline cases first');
  assert.equal(a.tokens, 4);
  assert.deepEqual(a.lineup, ['dash', 'sage', 'ledger', 'orator']);
  const leads = a.patients.reduce((m, p) => ({ ...m, [p.leadAdvisor]: (m[p.leadAdvisor] ?? 0) + 1 }), {});
  assert.ok(Object.values(leads).every((n) => n >= 2));
  assert.ok(a.patients.every((p) => Object.keys(p.advice).length === 4));
});

test('shift director: every seed fits the hard cap and averages about 7 minutes', () => {
  const ends = [];
  for (let i = 0; i < 100; i++) ends.push(buildShift({ seed: `cap-${i}`, cases: POOL, module: 'module3' }).estimatedEndSec);
  assert.ok(Math.max(...ends) <= shiftConfig.shift.hardCapSeconds, `max end ${Math.max(...ends)}s exceeds hard cap`);
  const avg = ends.reduce((a, b) => a + b, 0) / ends.length;
  assert.ok(avg >= 390 && avg <= 450, `average ${avg}s should be roughly 7 minutes`);
});

test('shift director: drift exists in module 3, hits a strong advisor, affects >= 1 later patient; none in modules 1 and 2', () => {
  for (let d = 1; d <= 12; d++) {
    const s = buildShift({ seed: `daily-2026-11-${String(d).padStart(2, '0')}`, cases: POOL, module: 'module3' });
    assert.ok(s.drift, `drift missing for day ${d}`);
    assert.equal(s.drift.atIndex, 8);
    assert.ok(advisorData.advisors[s.drift.advisorId].reliability[s.drift.category] >= 0.85);
    const hit = s.patients.filter((p) => p.index >= 8 && p.leadAdvisor === s.drift.advisorId && p.case.category === s.drift.category);
    assert.ok(hit.length >= 1);
  }
  assert.equal(buildShift({ seed: 'x', cases: POOL, module: 'module1' }).drift, null);
  assert.equal(buildShift({ seed: 'x', cases: POOL, module: 'module2' }).drift, null);
  assert.equal(buildShift({ seed: 'x', cases: POOL, module: 'module1' }).patients.length, 6);
  assert.equal(buildShift({ seed: 'x', cases: POOL, module: 'module2' }).patients.length, 10);
});

test('shift director: surge pairs get shorter windows and tight arrivals', () => {
  const s = buildShift({ seed: 'surge', cases: POOL, module: 'module3' });
  for (const i of shiftConfig.shift.surgeIndices) {
    assert.equal(s.patients[i].arrivalSec - s.patients[i - 1].arrivalSec, shiftConfig.shift.surgeGapSeconds);
    assert.equal(s.patients[i].windowSec, shiftConfig.shift.surgeWindowSeconds);
    assert.equal(s.patients[i - 1].windowSec, shiftConfig.shift.surgeWindowSeconds);
    assert.ok(s.patients[i].surge && s.patients[i - 1].surge);
  }
});

test('dailySeed: local date string', () => {
  assert.equal(dailySeed(new Date(2026, 10, 18)), 'daily-2026-11-18');
});

// ---- Debrief ------------------------------------------------------------------------------------------------
function entry(over) {
  const base = { index: 0, category: 'cardiac', advisorId: 'dash', commit: 'amber', advice: 'red', final: 'red', truth: 'red', surge: false };
  const e = { ...base, ...over };
  e.reliance = classifyReliance(e);
  return e;
}

test('debrief: over-reliance on one advisor is named', () => {
  const entries = [0, 1, 2, 3].map((i) => entry({ index: i, category: 'children', advisorId: 'dash', commit: 'red', advice: 'amber', final: 'amber', truth: 'red' }));
  const d = buildDebrief({ entries, advisorNames: { dash: 'Dash' } });
  assert.equal(d.headlineKey, 'overReliance');
  assert.equal(d.index, 0);
  assert.ok(d.findings[0].includes('Dash') && d.findings[0].includes('children'));
});

test('debrief: balanced shift', () => {
  const entries = [
    entry({ commit: 'amber', advice: 'red', final: 'red', truth: 'red' }),
    entry({ commit: 'red', advice: 'amber', final: 'red', truth: 'red' }),
    entry({ commit: 'green', advice: 'amber', final: 'amber', truth: 'amber' }),
    entry({ commit: 'amber', advice: 'green', final: 'amber', truth: 'amber' }),
  ];
  const d = buildDebrief({ entries });
  assert.equal(d.index, 100);
  assert.equal(d.headlineKey, 'balanced');
});

test('debrief: not enough disagreements', () => {
  const d = buildDebrief({ entries: [entry({ commit: 'red', advice: 'red', final: 'red' })] });
  assert.equal(d.headlineKey, 'notEnough');
  assert.equal(d.index, null);
});

test('debrief: drift detected vs missed', () => {
  const shift = { drift: { advisorId: 'dash', category: 'cardiac', atIndex: 8 } };
  const wrongAdvice = (idx, final) => entry({ index: idx, commit: 'red', advice: 'amber', final, truth: 'red' });
  const missed = buildDebrief({ entries: [wrongAdvice(9, 'amber'), wrongAdvice(10, 'amber')], shift });
  assert.equal(missed.drift.detected, false);
  assert.ok(missed.findings.some((f) => f.includes('changed mid-shift')));
  const detected = buildDebrief({ entries: [wrongAdvice(9, 'red'), wrongAdvice(10, 'red')], shift });
  assert.equal(detected.drift.detected, true);
});

test('debrief: pressure line when surge accuracy drops', () => {
  const calm = [0, 1, 2, 3].map((i) => entry({ index: i, commit: 'amber', advice: 'red', final: 'red', truth: 'red', surge: false }));
  const surge = [4, 5, 6, 7].map((i) => entry({ index: i, commit: 'amber', advice: 'red', final: 'amber', truth: 'red', surge: true }));
  const d = buildDebrief({ entries: [...calm, ...surge] });
  assert.ok(d.findings.some((f) => f.includes('surge')));
});

test('trust map: follow rate and advice accuracy per advisor and category', () => {
  const entries = [
    entry({ advisorId: 'ledger', category: 'injury', commit: 'red', advice: 'amber', final: 'amber', truth: 'red' }),
    entry({ advisorId: 'ledger', category: 'injury', commit: 'red', advice: 'amber', final: 'red', truth: 'red' }),
  ];
  const [row] = trustMap(entries);
  assert.equal(row.followRate, 0.5);
  assert.equal(row.adviceAccuracy, 0);
});
