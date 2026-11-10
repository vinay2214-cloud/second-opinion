// Game-logic triage rubric. Ground truth for every case is computed here, never by an LLM.
import { rubric } from './data.js';

export const ZONES = rubric.zones; // ['green','amber','red']
export const zoneIndex = (z) => ZONES.indexOf(z);

function bandFor(vital, ageBand, value) {
  const table = rubric.bands[vital][ageBand === 'child' ? 'child' : 'adult'];
  const band = table.find(([lo, hi]) => value >= lo && value <= hi);
  if (!band) throw new Error(`No band for ${vital}=${value}`);
  return { band, table };
}

function describe(vital, ageBand, value, table, band) {
  const zero = table.find((b) => b[2] === 0);
  const low = value < zero[0];
  const names = { pulse: low ? 'slow pulse' : 'fast pulse', sbp: low ? 'low pressure' : 'high pressure', spo2: 'low oxygen', temp: low ? 'low temperature' : 'high temperature' };
  return `${names[vital]} (${value})`;
}

export function zoneFromScore(score) {
  if (score >= rubric.thresholds.redMin) return 'red';
  if (score >= rubric.thresholds.amberMin) return 'amber';
  return 'green';
}

export function difficultyFromScore(score) {
  const d = Math.min(...rubric.difficulty.boundaries.map((b) => Math.abs(score - b)));
  if (d <= rubric.difficulty.borderlineMaxDistance) return 3;
  if (d <= rubric.difficulty.mediumMaxDistance) return 2;
  return 1;
}

export function triageScore(vitals, flags = [], ageBand = 'adult') {
  const parts = [];
  let score = 0;
  for (const vital of ['pulse', 'sbp', 'spo2', 'temp']) {
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

export function whyLine({ score, zone, parts }) {
  const Z = zone[0].toUpperCase() + zone.slice(1);
  const detail = parts.length ? parts.map((p) => p.label).join(', ') : 'all readings normal';
  return `Score ${score} puts this in ${Z}: ${detail}.`;
}

function tableFor(vital, ageBand) {
  return rubric.bands[vital][ageBand === 'child' ? 'child' : 'adult'];
}

/** Direction of a band relative to the normal (0-point) band: 'low' | 'high' | 'normal'. */
export function bandDirection(vital, ageBand, band) {
  const table = tableFor(vital, ageBand);
  const zeroIdx = table.findIndex((b) => b[2] === 0);
  const idx = table.indexOf(band);
  return idx < zeroIdx ? 'low' : idx > zeroIdx ? 'high' : 'normal';
}

/** Points and direction a reading scores. Used by the validator's plausibility rules. */
export function vitalReading(vital, ageBand, value) {
  const { band } = bandFor(vital, ageBand, value);
  return { points: band[2], dir: bandDirection(vital, ageBand, band) };
}

// For the generator: which bands carry a given number of points (optionally in one direction).
export function bandsWithPoints(vital, ageBand, points, dir = null) {
  return tableFor(vital, ageBand).filter((b) => b[2] === points && (!dir || bandDirection(vital, ageBand, b) === dir));
}

/** The game only generates abnormal readings in these directions (keeps cases plausible). */
export const TYPICAL_DIRECTION = { pulse: 'high', sbp: 'low', spo2: 'low', temp: 'high' };

export function limitsFor(ageBand) {
  return rubric.limits[ageBand === 'child' ? 'child' : 'default'];
}
