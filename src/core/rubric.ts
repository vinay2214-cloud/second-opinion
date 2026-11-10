import type { AgeBand, Band, Difficulty, Direction, TriageResult, Vital, Vitals, Zone } from './types.js';
// Game-logic triage rubric. Ground truth for every case is computed here, never by an LLM.
import { rubric } from './data.js';

export const ZONES = rubric.zones; // ['green','amber','red']
export const zoneIndex = (z: Zone) => ZONES.indexOf(z);

function bandFor(vital: Vital, ageBand: AgeBand, value: number) {
  const table = rubric.bands[vital][ageBand === 'child' ? 'child' : 'adult'];
  const band = table.find(([lo, hi]) => value >= lo && value <= hi);
  if (!band) throw new Error(`No band for ${vital}=${value}`);
  return { band, table };
}

function describe(vital: Vital, ageBand: AgeBand, value: number, table: Band[], band: Band) {
  const zero = table.find((b) => b[2] === 0)!;
  const low = value < zero[0];
  const names = { pulse: low ? 'slow pulse' : 'fast pulse', sbp: low ? 'low pressure' : 'high pressure', spo2: 'low oxygen', temp: low ? 'low temperature' : 'high temperature' };
  return `${names[vital]} (${value})`;
}

export function zoneFromScore(score: number): Zone {
  if (score >= rubric.thresholds.redMin) return 'red';
  if (score >= rubric.thresholds.amberMin) return 'amber';
  return 'green';
}

export function difficultyFromScore(score: number): Difficulty {
  const d = Math.min(...rubric.difficulty.boundaries.map((b) => Math.abs(score - b)));
  if (d <= rubric.difficulty.borderlineMaxDistance) return 3;
  if (d <= rubric.difficulty.mediumMaxDistance) return 2;
  return 1;
}

export function triageScore(vitals: Pick<Vitals, Vital>, flags: readonly string[] = [], ageBand: AgeBand = 'adult'): TriageResult {
  const parts = [];
  let score = 0;
  for (const vital of ['pulse', 'sbp', 'spo2', 'temp'] as const) {
    const { band, table } = bandFor(vital, ageBand, vitals[vital]);
    if (band[2] > 0) {
      score += band[2];
      parts.push({ label: describe(vital, ageBand, vitals[vital], table, band), points: band[2] });
    }
  }
  for (const f of flags) {
    const def = rubric.flags[f];
    if (!def) throw new Error(`Unknown flag ${f}`);
    score += def.points;
    parts.push({ label: def.label, points: def.points });
  }
  const zone = zoneFromScore(score);
  return { score, zone, difficulty: difficultyFromScore(score), parts };
}

export function whyLine({ score, zone, parts }: Pick<TriageResult, 'score' | 'zone' | 'parts'>): string {
  const Z = zone[0].toUpperCase() + zone.slice(1);
  const detail = parts.length ? parts.map((p) => p.label).join(', ') : 'all readings normal';
  return `Score ${score} puts this in ${Z}: ${detail}.`;
}

function tableFor(vital: Vital, ageBand: AgeBand) {
  return rubric.bands[vital][ageBand === 'child' ? 'child' : 'adult'];
}

/** Direction of a band relative to the normal (0-point) band: 'low' | 'high' | 'normal'. */
export function bandDirection(vital: Vital, ageBand: AgeBand, band: Band): Direction {
  const table = tableFor(vital, ageBand);
  const zeroIdx = table.findIndex((b) => b[2] === 0);
  const idx = table.indexOf(band);
  return idx < zeroIdx ? 'low' : idx > zeroIdx ? 'high' : 'normal';
}

/** Points and direction a reading scores. Used by the validator's plausibility rules. */
export function vitalReading(vital: Vital, ageBand: AgeBand, value: number) {
  const { band } = bandFor(vital, ageBand, value);
  return { points: band[2], dir: bandDirection(vital, ageBand, band) };
}

// For the generator: which bands carry a given number of points (optionally in one direction).
export function bandsWithPoints(vital: Vital, ageBand: AgeBand, points: number, dir: Direction | null = null) {
  return tableFor(vital, ageBand).filter((b) => b[2] === points && (!dir || bandDirection(vital, ageBand, b) === dir));
}

/** The game only generates abnormal readings in these directions (keeps cases plausible). */
export const TYPICAL_DIRECTION: Record<Vital, Direction> = { pulse: 'high', sbp: 'low', spo2: 'low', temp: 'high' };

export function limitsFor(ageBand: AgeBand) {
  return rubric.limits[ageBand === 'child' ? 'child' : 'default'];
}
