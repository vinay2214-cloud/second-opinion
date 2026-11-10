import type { AdvisorId, CalendarValue, Case, Category, Drift, ModuleId, Patient, Shift } from './types.js';
import type { Rng } from './rng.js';
// Shift Director: builds a whole shift deterministically from a seed. No network, no AI.
import { shiftConfig, advisorData } from './data.js';
import { makeRng } from './rng.js';
import { advise } from './advisors.js';

/** Daily shift seed from a local date, e.g. "daily-2026-11-18". The caller passes the date; the core never reads the clock. */
export function dailySeed(date: CalendarValue): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}

function quotas(n: number) {
  const green = Math.round((n * shiftConfig.shift.zoneQuota.green) / shiftConfig.shift.patients);
  const red = Math.round((n * shiftConfig.shift.zoneQuota.red) / shiftConfig.shift.patients);
  return { green, red, amber: n - green - red };
}

function selectCases(rng: Rng, cases: readonly Case[], n: number, ramp: number, surgeIdx: readonly number[]): Case[] {
  const q = quotas(n);
  const slots = rng.shuffle([...Array(q.green).fill('green'), ...Array(q.amber).fill('amber'), ...Array(q.red).fill('red')]);
  const used = new Set();
  const catUse: Partial<Record<Category, number>> = {};
  const chosen: Case[] = [];
  slots.forEach((zone, i) => {
    let cand = cases.filter((c) => c.truthZone === zone && !used.has(c.id));
    if (i < ramp) {
      const easy = cand.filter((c) => c.difficulty <= 2);
      if (easy.length) cand = easy;
    }
    const minCat = Math.min(...cand.map((c) => catUse[c.category] ?? 0));
    cand = cand.filter((c) => (catUse[c.category] ?? 0) === minCat);
    const pick = rng.pick(cand);
    used.add(pick.id);
    catUse[pick.category] = (catUse[pick.category] ?? 0) + 1;
    chosen.push(pick);
  });
  return chosen;
}

function pickDriftFor(rng: Rng, patients: readonly Patient[], lineup: readonly AdvisorId[], atIndex: number): Drift | null {
  const cfg = advisorData.drift;
  const counts = new Map();
  for (const p of patients) {
    if (p.index < atIndex) continue;
    const adv = advisorData.advisors[p.leadAdvisor];
    if (adv.mirror || adv.eloquent) continue;
    if (adv.reliability[p.case.category] < cfg.eligibleMinReliability) continue;
    const key = `${p.leadAdvisor}:${p.case.category}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.size) return null;
  const multi = [...counts.entries()].filter(([, n]) => n >= 2);
  const pool = (multi.length ? multi : [...counts.entries()]).map(([k]) => k).sort();
  const [advisorId, category] = pool[rng.int(pool.length)].split(':') as [AdvisorId, Category];
  return { advisorId, category, delta: cfg.delta, atIndex };
}

/**
 * @param {{seed:string, cases:object[], module?:'module1'|'module2'|'module3', lineup?:string[]}} args
 */
export function buildShift({ seed, cases, module = 'module3', lineup = null }: { seed: string; cases: readonly Case[]; module?: ModuleId; lineup?: AdvisorId[] | null }): Shift {
  const sc = shiftConfig.shift;
  const mod = shiftConfig.modules[module];
  const advisors = lineup ?? shiftConfig.lineups[module];
  const n = mod.patients;
  const rng = makeRng(seed, 'shift', module);

  const picked = selectCases(rng, cases, n, sc.rampPatients, mod.surgeIndices);
  const surgeSet = new Set();
  for (const i of mod.surgeIndices) { surgeSet.add(i); surgeSet.add(i - 1); }

  const leadOrder: AdvisorId[] = [];
  while (leadOrder.length < n) leadOrder.push(...rng.shuffle(advisors));
  leadOrder.length = n;

  let t = sc.firstArrivalSeconds;
  const patients = picked.map((c, i): Patient => {
    if (i > 0) t += mod.surgeIndices.includes(i) ? sc.surgeGapSeconds : rng.range(sc.arrivalGapSeconds[0], sc.arrivalGapSeconds[1]);
    return {
      index: i,
      caseId: c.id,
      case: c,
      arrivalSec: t,
      windowSec: surgeSet.has(i) ? sc.surgeWindowSeconds : sc.windowSeconds,
      surge: surgeSet.has(i),
      leadAdvisor: leadOrder[i],
    } as Patient; // Advice is populated below, in the same order as the reference.
  });

  const atIndex = Math.floor(advisorData.drift.atFraction * n);
  const drift = mod.driftEnabled ? pickDriftFor(makeRng(seed, 'drift', module), patients, advisors, atIndex) : null;

  for (const p of patients) {
    p.advice = {};
    for (const id of advisors) {
      if (advisorData.advisors[id].mirror) continue; // Echo is computed live from the player's commit
      p.advice[id] = advise({ seed, caseObj: p.case, advisorId: id, patientIndex: p.index, drift });
    }
  }

  const last = patients[patients.length - 1];
  return {
    seed, module, lineup: advisors,
    tokens: mod.tokens,
    drift,
    patients,
    hardCapSeconds: sc.hardCapSeconds,
    estimatedEndSec: last.arrivalSec + last.windowSec,
  };
}
