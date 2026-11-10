import type { AdvisorId, Debrief, DebriefEntry, DebriefOptions, HeadlineKey } from './types.js';
// Calibration Coach (deterministic part). An optional LLM may narrate these facts, but the facts come from here.
import { debriefLines as L, shiftConfig } from './data.js';
import { calibrationIndex, trustMap } from './reliance.js';
import { verifyYield } from './scoring.js';

const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * @param entries  per-patient log: {index, category, advisorId, commit, advice, final, truth, reliance, surge, missed}
 * @param shift    output of buildShift (for drift info)
 * @param verifyEvents [{revealedDisagreement, fixedWrongCall}]
 * @param advisorNames map id -> display name
 */
export function buildDebrief({ entries, shift = null, verifyEvents = [], advisorNames = {} }: DebriefOptions): Debrief {
  const cal = calibrationIndex(entries);
  const c = cal.counts;
  const over = c['switch-wrong'];
  const under = c['hold-wrong'];
  const o = cal.overRelianceRate ?? 0;
  const u = cal.underRelianceRate ?? 0;

  let key: HeadlineKey;
  if (cal.index === null) key = 'notEnough';
  else if (o >= 0.4 && u >= 0.4) key = 'mixed';
  else if (o >= 0.5) key = 'overReliance';
  else if (u >= 0.5) key = 'underReliance';
  else key = 'balanced';

  const findings = [];
  const name = (id: AdvisorId) => advisorNames[id] ?? cap(id);

  const tm = trustMap(entries).filter((r) => r.disagreements >= 2);
  const flagged = [];
  for (const r of tm) {
    if (r.followRate >= 0.75 && r.adviceAccuracy <= 0.5) flagged.push({ sev: r.disagreements, text: fill(L.advisorOver, { advisor: name(r.advisorId), category: r.category, followed: r.followed, n: r.disagreements, right: r.adviceRight }) });
    else if (r.followRate <= 0.25 && r.adviceAccuracy >= 0.6) flagged.push({ sev: r.disagreements, text: fill(L.advisorUnder, { advisor: name(r.advisorId), category: r.category, held: r.disagreements - r.followed, n: r.disagreements, right: r.adviceRight }) });
  }
  flagged.sort((a, b) => b.sev - a.sev).slice(0, 2).forEach((f) => findings.push(f.text));

  let driftResult: Debrief['drift'] = null;
  if (shift?.drift) {
    const d = shift.drift;
    const after = entries.filter((e) => e.index >= d.atIndex && e.advisorId === d.advisorId && e.category === d.category && e.advice !== e.truth && e.advice !== e.commit);
    if (after.length) {
      const held = after.filter((e) => e.final !== e.advice).length;
      const detected = held / after.length >= 0.5;
      driftResult = { detected, affected: after.length, held };
      findings.push(fill(detected ? L.drift.detected : L.drift.missed, { advisor: name(d.advisorId), category: d.category }));
    }
  }

  const y = verifyYield(verifyEvents);
  if (verifyEvents.length >= 2 && y !== null) {
    if (y < 0.5) findings.push(L.tokens.wasted);
    else if (y >= 0.67) findings.push(L.tokens.wellSpent);
  }

  const acc = (xs: readonly DebriefEntry[]) => (xs.length ? xs.filter((e) => e.final === e.truth).length / xs.length : null);
  const surgeAcc = acc(entries.filter((e) => e.surge));
  const calmAcc = acc(entries.filter((e) => !e.surge));
  if (surgeAcc !== null && calmAcc !== null && calmAcc - surgeAcc >= 0.2) findings.push(L.pressure);

  return {
    index: cal.index,
    scorable: cal.scorable,
    counts: c,
    overRelianceRate: cal.overRelianceRate,
    underRelianceRate: cal.underRelianceRate,
    verifyYield: y,
    drift: driftResult,
    headlineKey: key,
    headline: fill(L.headline[key], { n: key === 'overReliance' ? over : under, over, under }),
    findings: findings.slice(0, shiftConfig.calibration ? 4 : 4),
    nextStep: L.nextStep[key],
  };
}
