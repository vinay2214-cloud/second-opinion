import { test, assert } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { triageScore, zoneFromScore, difficultyFromScore } from '../src/core/rubric.js';
import type { AdvisorId, Category, DebriefEntry, Drift, Reliance, Zone } from '../src/core/types.js';
import { loadCases, advisorData, shiftConfig } from '../src/core/data.js';
const POOL = loadCases();


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
