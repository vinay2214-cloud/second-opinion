import type { Calibration, DebriefEntry, Reliance, RelianceInput, TrustRow } from './types.js';
// Reliance classification and the Calibration index.
import { shiftConfig } from './data.js';

/**
 * Classify one patient. Only cases where the lead advisor's call differs from the player's commit count.
 * @returns 'agree' | 'switch-right' | 'hold-right' | 'switch-wrong' | 'hold-wrong' | 'both-wrong' | 'other'
 */
export function classifyReliance({ commit, advice, final, truth }: RelianceInput): Reliance {
  if (commit === advice) return 'agree';
  if (final === advice) {
    if (advice === truth) return 'switch-right';
    if (commit === truth) return 'switch-wrong';
    return 'both-wrong';
  }
  if (final === commit) {
    if (commit === truth) return 'hold-right';
    if (advice === truth) return 'hold-wrong';
    return 'both-wrong';
  }
  return 'other'; // player moved to a third tray: excluded from the index
}

const empty = () => ({ 'switch-right': 0, 'hold-right': 0, 'switch-wrong': 0, 'hold-wrong': 0, 'both-wrong': 0, agree: 0, other: 0 });

export function tally(entries: readonly Pick<DebriefEntry, 'reliance'>[]) {
  const c = empty();
  for (const e of entries) c[e.reliance] += 1;
  return c;
}

const ratio = (num: number, den: number) => (den === 0 ? null : num / den);

/**
 * Calibration index = (SR + HR) / (SR + HR + SW + HW), shown 0..100.
 * overRelianceRate  = SW / (SW + HR): when the advice was wrong and you were right, how often you followed it.
 * underRelianceRate = HW / (HW + SR): when the advice was right and you were wrong, how often you held out.
 * Returns null index when there are too few disagreements to be meaningful.
 */
export function calibrationIndex(entries: readonly Pick<DebriefEntry, 'reliance'>[], minDisagreements = shiftConfig.calibration.minDisagreementsForIndex): Calibration {
  const c = tally(entries);
  const den = c['switch-right'] + c['hold-right'] + c['switch-wrong'] + c['hold-wrong'];
  const idx = ratio(c['switch-right'] + c['hold-right'], den);
  return {
    counts: c,
    scorable: den,
    index: den >= minDisagreements && idx !== null ? Math.round(idx * 100) : null,
    overRelianceRate: ratio(c['switch-wrong'], c['switch-wrong'] + c['hold-right']),
    underRelianceRate: ratio(c['hold-wrong'], c['hold-wrong'] + c['switch-right']),
  };
}

/** Per-advisor and per-category follow rates on disagreements (for the Trust map). */
export function trustMap(entries: readonly Pick<DebriefEntry, 'advisorId' | 'category' | 'reliance' | 'final' | 'advice' | 'truth'>[]): TrustRow[] {
  const out: Record<string, Omit<TrustRow, 'followRate' | 'adviceAccuracy'>> = {};
  for (const e of entries) {
    if (e.reliance === 'agree' || e.reliance === 'other') continue;
    const key = `${e.advisorId}:${e.category}`;
    out[key] ??= { advisorId: e.advisorId, category: e.category, disagreements: 0, followed: 0, adviceRight: 0 };
    out[key].disagreements += 1;
    if (e.final === e.advice) out[key].followed += 1;
    if (e.advice === e.truth) out[key].adviceRight += 1;
  }
  return Object.values(out).map((r) => ({ ...r, followRate: r.followed / r.disagreements, adviceAccuracy: r.adviceRight / r.disagreements }));
}
