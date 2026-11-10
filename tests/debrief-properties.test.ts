import { describe, expect, test } from 'vitest';
import { advisorData, shiftConfig } from '../src/core/data.js';
import { makeRng } from '../src/core/rng.js';
import { ZONES } from '../src/core/rubric.js';
import { classifyReliance, calibrationIndex } from '../src/core/reliance.js';
import { buildDebrief } from '../src/core/debrief.js';
import type { AdvisorId, DebriefEntry, DebriefOptions, Reliance } from '../src/core/types.js';

const advisors = Object.keys(advisorData.advisors) as AdvisorId[];
const classes: Reliance[] = ['agree', 'switch-right', 'hold-right', 'switch-wrong', 'hold-wrong', 'both-wrong', 'other'];
const scored: Reliance[] = ['switch-right', 'hold-right', 'switch-wrong', 'hold-wrong'];

function generatedLog(seed: number): DebriefEntry[] {
  const rng = makeRng('T09-properties', seed);
  return Array.from({ length: seed === 0 ? 0 : rng.int(201) }, (_, index) => {
    const calls = { commit: rng.pick(ZONES), advice: rng.pick(ZONES), final: rng.pick(ZONES), truth: rng.pick(ZONES) };
    return { ...calls, index, category: rng.pick(advisorData.categories), advisorId: rng.pick(advisors), surge: rng.chance(0.3), reliance: classifyReliance(calls) };
  });
}

function expectRate(rate: number | null): void {
  if (rate === null) return;
  expect(Number.isFinite(rate)).toBe(true);
  expect(rate).toBeGreaterThanOrEqual(0);
  expect(rate).toBeLessThanOrEqual(1);
}

describe('T09 reliance and debrief properties', () => {
  test('all 81 zone combinations have the expected branch totals and calibration', () => {
    const entries: DebriefEntry[] = [];
    for (const commit of ZONES) for (const advice of ZONES) for (const final of ZONES) for (const truth of ZONES) {
      const calls = { commit, advice, final, truth };
      entries.push({ ...calls, index: entries.length, advisorId: 'dash', category: 'cardiac', reliance: classifyReliance(calls) });
    }
    expect(entries).toHaveLength(81);
    expect(calibrationIndex(entries)).toEqual({
      counts: { agree: 27, 'switch-right': 6, 'hold-right': 6, 'switch-wrong': 6, 'hold-wrong': 6, 'both-wrong': 12, other: 18 },
      scorable: 24, index: 50, overRelianceRate: 0.5, underRelianceRate: 0.5,
    });
  });

  test('agree is determined by commit versus advice even when final moves away', () => {
    for (const commit of ZONES) for (const final of ZONES) for (const truth of ZONES) {
      expect(classifyReliance({ commit, advice: commit, final, truth })).toBe('agree');
    }
  });

  test('300 seeded logs keep rates and index within bounds and counts account for every entry', () => {
    for (let seed = 0; seed < 300; seed++) {
      const entries = generatedLog(seed);
      const result = calibrationIndex(entries);
      expect(Object.values(result.counts).reduce((a, b) => a + b, 0)).toBe(entries.length);
      for (const kind of classes) expect(result.counts[kind]).toBe(entries.filter((entry) => entry.reliance === kind).length);
      expect(result.scorable).toBe(entries.filter((entry) => scored.includes(entry.reliance)).length);
      expectRate(result.overRelianceRate);
      expectRate(result.underRelianceRate);
      if (result.scorable < shiftConfig.calibration.minDisagreementsForIndex) expect(result.index).toBeNull();
      else {
        expect(result.index).not.toBeNull();
        expect(Number.isInteger(result.index)).toBe(true);
        expect(result.index).toBeGreaterThanOrEqual(0);
        expect(result.index).toBeLessThanOrEqual(100);
      }
      expect(calibrationIndex([...entries].reverse())).toEqual(result);
    }
  });

  test('empty and unscorable logs keep missing denominators null', () => {
    expect(calibrationIndex([])).toMatchObject({ scorable: 0, index: null, overRelianceRate: null, underRelianceRate: null });
    expect(calibrationIndex([{ reliance: 'agree' }, { reliance: 'both-wrong' }, { reliance: 'other' }]))
      .toMatchObject({ scorable: 0, index: null, overRelianceRate: null, underRelianceRate: null });
  });

  test('300 seeded debriefs repeat exactly without mutating logs, drift or verify facts', () => {
    for (let seed = 0; seed < 300; seed++) {
      const entries = generatedLog(seed);
      const options: DebriefOptions = {
        entries,
        shift: { drift: { advisorId: advisors[seed % advisors.length], category: advisorData.categories[seed % advisorData.categories.length], atIndex: Math.floor(entries.length / 2) } },
        verifyEvents: entries.filter((entry) => entry.index % 3 === 0).map((entry) => ({ revealedDisagreement: entry.advice !== entry.commit, fixedWrongCall: entry.final === entry.truth && entry.commit !== entry.truth })),
        advisorNames: Object.fromEntries(advisors.map((id) => [id, advisorData.advisors[id].name])),
      };
      const before = structuredClone(options);
      const first = buildDebrief(options);
      expect(buildDebrief(options)).toEqual(first);
      expect(buildDebrief(before)).toEqual(first);
      expect(options).toEqual(before);
      expectRate(first.overRelianceRate);
      expectRate(first.underRelianceRate);
      expectRate(first.verifyYield);
      const calibration = calibrationIndex(entries);
      expect(first.counts).toEqual(calibration.counts);
      expect(first.index).toBe(calibration.index);
      expect(first.scorable).toBe(calibration.scorable);
    }
  });
});
