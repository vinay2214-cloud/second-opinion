// Advisor engine: deterministic from (seed, caseId, advisorId). Hidden reliability never leaves this module.
import { advisorData } from './data.js';
import { makeRng } from './rng.js';
import { ZONES, zoneIndex } from './rubric.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** drift = { advisorId, category, delta, atIndex }  (category '*' = all). Active when patientIndex >= atIndex. */
export function effectiveReliability(advisorId, category, truth, patientIndex = 0, drift = null) {
  const adv = advisorData.advisors[advisorId];
  let r = adv.reliability[category];
  if (drift && drift.advisorId === advisorId && patientIndex >= drift.atIndex && (drift.category === category || drift.category === '*')) {
    r = clamp(r + drift.delta, advisorData.drift.floor, 0.99);
  }
  if (adv.redFloor && truth === 'red') r = Math.max(r, adv.redFloor);
  return r;
}

function wrongCall(adv, truth, rng) {
  const t = zoneIndex(truth);
  if (adv.errorMode === 'upgrade' && t < 2) return ZONES[t + 1];
  // adjacent errors (also the fallback when an upgrade is impossible)
  const options = [t - 1, t + 1].filter((i) => i >= 0 && i <= 2);
  return ZONES[options[rng.int(options.length)]];
}

/**
 * @returns {{advisorId, call, correct, statedConfidence, line}}
 * playerCommit is only needed for mirror advisors (Echo).
 */
export function advise({ seed, caseObj, advisorId, patientIndex = 0, drift = null, playerCommit = null }) {
  const adv = advisorData.advisors[advisorId];
  const rng = makeRng(seed, caseObj.id, advisorId);
  let call;
  if (adv.mirror) {
    call = playerCommit ?? caseObj.truthZone;
  } else {
    const r = effectiveReliability(advisorId, caseObj.category, caseObj.truthZone, patientIndex, drift);
    call = rng.chance(r) ? caseObj.truthZone : wrongCall(adv, caseObj.truthZone, rng);
  }
  const template = adv.lines[rng.int(adv.lines.length)];
  const callWord = call[0].toUpperCase() + call.slice(1);
  return {
    advisorId,
    call,
    correct: call === caseObj.truthZone,
    statedConfidence: adv.statedConfidence,
    line: template.replaceAll('{call}', callWord),
  };
}
