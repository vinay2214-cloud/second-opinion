// Outcome scoring. Numbers live in data/shift-config.json.
import { shiftConfig } from './data.js';
import { zoneIndex } from './rubric.js';

export function speedBonus(msToCommit) {
  if (msToCommit == null) return 0;
  for (const [limit, pts] of shiftConfig.scoring.speedBonus) if (msToCommit <= limit) return pts;
  return 0;
}

/** Outcome score for one patient. `missed` = no commit before the window ended (auto-Amber). */
export function outcomeScore({ final, truth, msToCommit = null, missed = false }) {
  const s = shiftConfig.scoring;
  const dist = Math.abs(zoneIndex(final) - zoneIndex(truth));
  let pts = dist === 0 ? s.correct : dist === 1 ? s.oneOff : s.twoOff;
  if (dist === 0 && !missed) pts += speedBonus(msToCommit);
  if (missed) pts += s.missedWindowPenalty;
  return pts;
}

export function shiftScore(entries, tokensLeft = 0) {
  const outcome = entries.reduce((sum, e) => sum + outcomeScore(e), 0);
  const restraint = Math.max(0, tokensLeft) * shiftConfig.verify.unspentTokenBonus;
  return { outcome, restraint, total: outcome + restraint };
}

/** Verify yield: share of spent tokens that revealed a disagreement or fixed a wrong call. */
export function verifyYield(verifyEvents) {
  if (!verifyEvents.length) return null;
  const useful = verifyEvents.filter((v) => v.revealedDisagreement || v.fixedWrongCall).length;
  return useful / verifyEvents.length;
}
