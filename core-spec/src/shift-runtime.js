// Shift runtime: the authoritative state machine for one shift. Pure logic, no rendering, no timers of its own.
// The ECS layer calls these methods and renders the results. The UI may only read publicView(), never internals.
import { shiftConfig, advisorData } from './data.js';
import { classifyReliance } from './reliance.js';
import { outcomeScore, shiftScore } from './scoring.js';
import { buildDebrief } from './debrief.js';

export function createShiftRuntime({ shift, advisorNames = {}, calm = false }) {
  const cfg = shiftConfig;
  const speed = calm ? 1.5 : 1; // calm mode: slower arrivals and longer windows
  let t0 = null;
  let offsetSec = 0;
  let tokens = shift.tokens ?? 0;
  let ended = false;
  const queue = [];
  const log = [];
  const verifyEvents = [];

  const ps = shift.patients.map((p) => ({
    p,
    arrivalSec: p.arrivalSec * speed,
    windowSec: p.windowSec * speed,
    status: 'pending', // pending -> arrived -> committed -> resolved
    commit: null,
    msToCommit: null,
    verified: [],
    final: null,
    result: null,
  }));

  const elapsed = (nowMs) => (t0 === null ? 0 : (nowMs - t0) / 1000 + offsetSec);
  const emit = (e) => queue.push(e);
  const need = (cond, reason) => ({ ok: cond, reason: cond ? null : reason });

  function resolve(i, final, nowMs, { missed = false } = {}) {
    const s = ps[i];
    const lead = s.p.advice[s.p.leadAdvisor];
    const truth = s.p.case.truthZone;
    const entry = {
      index: i, caseId: s.p.caseId, category: s.p.case.category, advisorId: s.p.leadAdvisor,
      commit: s.commit, advice: lead.call, final, truth, msToCommit: s.msToCommit, surge: s.p.surge, missed,
      usedVerify: s.verified.length > 0,
      reliance: missed ? 'other' : classifyReliance({ commit: s.commit, advice: lead.call, final, truth }),
    };
    entry.delta = outcomeScore(entry);
    for (const v of s.verified) {
      v.fixedWrongCall = s.commit !== truth && final === truth && v.call === final;
      verifyEvents.push({ index: i, advisorId: v.advisorId, revealedDisagreement: v.revealedDisagreement, fixedWrongCall: v.fixedWrongCall });
    }
    s.status = 'resolved';
    s.final = final;
    s.result = { truth, whyLine: s.p.case.whyLine, delta: entry.delta, reliance: entry.reliance };
    log.push(entry);
    emit({ type: 'resolved', index: i, ...s.result, missed });
  }

  function maybeEnd(nowMs) {
    if (ended) return;
    const done = ps.every((s) => s.status === 'resolved');
    if (done || elapsed(nowMs) >= cfg.shift.hardCapSeconds) {
      for (let i = 0; i < ps.length; i++) {
        const s = ps[i];
        if (s.status === 'committed') resolve(i, s.commit, nowMs);
        else if (s.status !== 'resolved') resolve(i, 'amber', nowMs, { missed: true });
      }
      ended = true;
      emit({ type: 'shiftEnd' });
    }
  }

  return {
    start(nowMs) { t0 = nowMs; return this.tick(nowMs); },

    /** Advance the clock. Returns the events since the last call: arrive, resolved (timeouts / auto-keep), shiftEnd. */
    tick(nowMs) {
      if (t0 === null || ended) return queue.splice(0);
      const e = elapsed(nowMs);
      ps.forEach((s, i) => {
        if (s.status === 'pending' && e >= s.arrivalSec) { s.status = 'arrived'; emit({ type: 'arrive', index: i }); }
        if (e >= s.arrivalSec + s.windowSec) {
          if (s.status === 'arrived') resolve(i, 'amber', nowMs, { missed: true });
          else if (s.status === 'committed') resolve(i, s.commit, nowMs); // auto-keep at the deadline
        }
      });
      maybeEnd(nowMs);
      return queue.splice(0);
    },

    /** Lock the player's own call. Advice stays hidden until this succeeds. */
    commit(i, zone, nowMs) {
      const s = ps[i];
      const g = need(s && s.status === 'arrived', 'patient not awaiting a commit');
      if (!g.ok) return g;
      s.commit = zone;
      s.msToCommit = Math.round((elapsed(nowMs) - s.arrivalSec) * 1000);
      s.status = 'committed';
      const lead = s.p.advice[s.p.leadAdvisor];
      return { ok: true, lead: { advisorId: lead.advisorId, call: lead.call, line: lead.line, statedConfidence: lead.statedConfidence } };
    },

    /** Spend a token and clock time to hear another advisor. */
    verify(i, advisorId, nowMs) {
      const s = ps[i];
      if (!s || s.status !== 'committed') return need(false, 'commit first');
      if (tokens <= 0) return need(false, 'no verify tokens left');
      if (advisorId === s.p.leadAdvisor) return need(false, 'already heard this advisor');
      if (!s.p.advice[advisorId]) return need(false, 'advisor not in lineup');
      if (s.verified.some((v) => v.advisorId === advisorId)) return need(false, 'already verified with this advisor');
      tokens -= 1;
      offsetSec += cfg.verify.clockCostSeconds;
      const a = s.p.advice[advisorId];
      const lead = s.p.advice[s.p.leadAdvisor];
      s.verified.push({ advisorId, call: a.call, revealedDisagreement: a.call !== lead.call, fixedWrongCall: false });
      this.tick(nowMs); // the clock jumped, so arrivals and deadlines may now be due
      return { ok: true, advice: { advisorId, call: a.call, line: a.line, statedConfidence: a.statedConfidence }, tokens };
    },

    /** Keep (zone === commit) or change the call, then reveal the truth. */
    finalize(i, zone, nowMs) {
      const s = ps[i];
      if (!s || s.status !== 'committed') return need(false, 'nothing to finalize');
      resolve(i, zone, nowMs);
      maybeEnd(nowMs);
      return { ok: true, result: s.result };
    },

    /** The only data the UI may render. Advice appears after commit; truth only after resolve. */
    publicView(i) {
      const s = ps[i];
      const c = s.p.case;
      const view = {
        index: i, status: s.status, surge: s.p.surge, arrivalSec: s.arrivalSec, windowSec: s.windowSec,
        case: { id: c.id, ageBand: c.ageBand, complaint: c.complaint, vitals: c.vitals, category: c.category },
        leadAdvisor: s.p.leadAdvisor,
        commit: s.commit,
      };
      if (s.status === 'committed' || s.status === 'resolved') {
        const a = s.p.advice[s.p.leadAdvisor];
        view.lead = { advisorId: a.advisorId, call: a.call, line: a.line, statedConfidence: a.statedConfidence };
        view.verified = s.verified.map((v) => ({ advisorId: v.advisorId, call: s.p.advice[v.advisorId].call, line: s.p.advice[v.advisorId].line }));
      }
      if (s.status === 'resolved') view.result = s.result;
      return view;
    },

    /** Advisors the player may still poke for this patient. */
    availableVerifiers(i) {
      const s = ps[i];
      if (s.status !== 'committed' || tokens <= 0) return [];
      return shift.lineup.filter((id) => !advisorData.advisors[id].mirror && id !== s.p.leadAdvisor && !s.verified.some((v) => v.advisorId === id));
    },

    /** Drift cue: which advisor shows the 'update installed' badge (true once the drift point is reached). */
    driftCue(nowMs) {
      if (!shift.drift) return null;
      const reached = ps[shift.drift.atIndex] && ['arrived', 'committed', 'resolved'].includes(ps[shift.drift.atIndex].status);
      return reached ? { advisorId: shift.drift.advisorId, text: advisorData.drift.cueText } : null;
    },

    get tokens() { return tokens; },
    get ended() { return ended; },
    elapsedSec: elapsed,
    remainingSec(nowMs) { return Math.max(0, cfg.shift.hardCapSeconds - elapsed(nowMs)); },
    log: () => log.slice(),
    score: () => shiftScore(log, tokens),
    summary() {
      return { entries: log.slice(), score: shiftScore(log, tokens), tokensLeft: tokens, debrief: buildDebrief({ entries: log, shift, verifyEvents, advisorNames }) };
    },
  };
}
