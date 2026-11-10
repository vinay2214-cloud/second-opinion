// Calibration Coach safety layer. An optional LLM may narrate the facts, but this module:
//  1. builds the facts from the debrief (plain data, no free text, no identifiers),
//  2. validates facts (the serverless proxy reuses this, so crafted requests cannot inject text),
//  3. validates the model's text before the player ever sees it,
//  4. provides the deterministic fallback. The LLM never decides truth, scores or advice.
import { debriefLines as L, coachConfig as C } from './data.js';
import { trustMap } from './reliance.js';

export const COACH_FACTS_VERSION = 1;
const pct = (x) => (x === null || x === undefined ? null : Math.round(x * 100));
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** @returns plain facts object. advisorNames maps id -> display name. */
export function buildCoachFacts({ debrief, entries, shift = null, advisorNames = {} }) {
  const name = (id) => advisorNames[id] ?? cap(id);
  const patterns = [];
  for (const r of trustMap(entries).filter((x) => x.disagreements >= 2)) {
    if (r.followRate >= 0.75 && r.adviceAccuracy <= 0.5) {
      patterns.push({ kind: 'followedTooOften', advisor: name(r.advisorId), category: r.category, count: r.followed, of: r.disagreements, adviceRight: r.adviceRight });
    } else if (r.followRate <= 0.25 && r.adviceAccuracy >= 0.6) {
      patterns.push({ kind: 'overruledTooOften', advisor: name(r.advisorId), category: r.category, count: r.disagreements - r.followed, of: r.disagreements, adviceRight: r.adviceRight });
    }
  }
  patterns.sort((a, b) => b.of - a.of);
  return {
    v: COACH_FACTS_VERSION,
    headline: debrief.headlineKey,
    index: debrief.index === null ? null : Math.round(debrief.index),
    disagreements: debrief.scorable,
    overRelianceRate: pct(debrief.overRelianceRate),
    underRelianceRate: pct(debrief.underRelianceRate),
    verifyYield: pct(debrief.verifyYield),
    drift: shift?.drift && debrief.drift ? { advisor: name(shift.drift.advisorId), category: shift.drift.category, noticed: !!debrief.drift.detected } : null,
    pressureDrop: debrief.findings.includes(L.pressure),
    patterns: patterns.slice(0, 2),
  };
}

const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const isIntOrNull = (x, lo, hi) => x === null || isInt(x, lo, hi);
const ONLY = (obj, keys) => Object.keys(obj).every((k) => keys.includes(k));

/** Strict schema check. Every string must come from an allowlist, so no free text can reach the prompt. */
export function validateCoachFacts(f) {
  const A = C.allowed;
  const bad = (why) => ({ ok: false, reason: why });
  if (!f || typeof f !== 'object' || Array.isArray(f)) return bad('not an object');
  if (!ONLY(f, ['v', 'headline', 'index', 'disagreements', 'overRelianceRate', 'underRelianceRate', 'verifyYield', 'drift', 'pressureDrop', 'patterns'])) return bad('unexpected key');
  if (f.v !== COACH_FACTS_VERSION) return bad('version');
  if (!A.headline.includes(f.headline)) return bad('headline');
  if (!isIntOrNull(f.index, 0, 100)) return bad('index');
  if (!isInt(f.disagreements, 0, 40)) return bad('disagreements');
  for (const k of ['overRelianceRate', 'underRelianceRate', 'verifyYield']) if (!isIntOrNull(f[k], 0, 100)) return bad(k);
  if (typeof f.pressureDrop !== 'boolean') return bad('pressureDrop');
  if (f.drift !== null) {
    if (typeof f.drift !== 'object' || !ONLY(f.drift, ['advisor', 'category', 'noticed'])) return bad('drift');
    if (!A.advisor.includes(f.drift.advisor) || !A.category.includes(f.drift.category) || typeof f.drift.noticed !== 'boolean') return bad('drift values');
  }
  if (!Array.isArray(f.patterns) || f.patterns.length > 2) return bad('patterns');
  for (const p of f.patterns) {
    if (!p || !ONLY(p, ['kind', 'advisor', 'category', 'count', 'of', 'adviceRight'])) return bad('pattern keys');
    if (!A.patternKind.includes(p.kind) || !A.advisor.includes(p.advisor) || !A.category.includes(p.category)) return bad('pattern values');
    if (!isInt(p.count, 0, 40) || !isInt(p.of, 1, 40) || !isInt(p.adviceRight, 0, 40) || p.count > p.of || p.adviceRight > p.of) return bad('pattern numbers');
  }
  if (f.headline === 'notEnough' && f.index !== null) return bad('notEnough must have null index');
  return { ok: true, reason: null };
}

function numbersIn(value, out = new Set()) {
  if (typeof value === 'number') { out.add(String(value)); out.add(String(Math.round(value))); }
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (k !== 'v') numbersIn(v, out);
  return out;
}

/** Validate what the model returned. Anything that fails falls back to the template text. */
export function validateCoachText(text, facts) {
  const lim = C.limits;
  const bad = (why) => ({ ok: false, reason: why, text: null });
  if (typeof text !== 'string') return bad('not a string');
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < lim.minChars) return bad('too short');
  if (t.length > lim.maxChars) return bad('too long');
  const words = t.split(' ').length;
  if (words > lim.hardMaxWords) return bad('too many words');
  const sentences = (t.match(/[.!?](\s|$)/g) || []).length;
  if (sentences < 1 || sentences > lim.maxSentences) return bad('sentence count');
  if (/[*#`_[\]{}<>|\\]|^\s*[-•\d]+[.)]\s/m.test(t)) return bad('markup');
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)) return bad('emoji');
  for (const p of C.blockedPatterns) if (new RegExp(p, 'i').test(t)) return bad(`blocked: ${p}`);
  const allowed = numbersIn(facts);
  for (const n of t.match(/\d+(?:\.\d+)?/g) || []) if (!allowed.has(n)) return bad(`number not in facts: ${n}`);
  if (facts?.headline === 'notEnough' && /\d/.test(t)) return bad('numbers with notEnough');
  return { ok: true, reason: null, text: t };
}

/** Deterministic fallback: exactly what the template debrief already says. */
export function coachFallback(debrief) {
  return `${debrief.headline} ${debrief.nextStep}`;
}

/** Client policy in one place: use the model text only if it validates, otherwise the fallback. */
export function chooseCoachText({ modelText, facts, debrief }) {
  const v = validateCoachText(modelText, facts);
  return v.ok ? { source: 'coach', text: v.text } : { source: 'template', text: coachFallback(debrief), reason: v.reason };
}
