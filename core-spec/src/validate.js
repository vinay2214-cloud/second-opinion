// Validator for the case pool. Plain code, not an LLM. Returns a list of problems (empty = valid).
import { caseTemplates, advisorData } from './data.js';
import { triageScore, whyLine, ZONES, vitalReading, TYPICAL_DIRECTION } from './rubric.js';
import { rulesFor } from './generator.js';

const SAFE_TEXT = /^[A-Za-z0-9 ,.'()\/-]+$/;

/** Complaint text must match its vitals (e.g. 'very hot' needs a high temperature). */
export function plausibility(c) {
  const cfg = caseTemplates.categories[c.category];
  const tpl = cfg?.templates.find((t) => t.text === c.complaint);
  if (!tpl) return [`${c.id}: complaint not in templates`];
  const out = [];
  const rules = rulesFor(cfg, tpl);
  for (const vital of Object.keys(TYPICAL_DIRECTION)) {
    const r = vitalReading(vital, c.ageBand, c.vitals[vital]);
    if (r.points > 0 && r.dir !== TYPICAL_DIRECTION[vital]) out.push(`${c.id}: ${vital} ${c.vitals[vital]} is abnormal in an atypical direction`);
  }
  for (const [vital, rule] of Object.entries(rules)) {
    if (rule === 'any') continue;
    const r = vitalReading(vital, c.ageBand, c.vitals[vital]);
    if (rule === 'mild') { if (r.points > 1) out.push(`${c.id}: ${vital} ${c.vitals[vital]} too severe for "${c.complaint}"`); continue; }
    if (rule === 'normal') { if (r.points !== 0) out.push(`${c.id}: ${vital} should be normal for "${c.complaint}"`); continue; }
    if (r.dir !== rule.dir || r.points < (rule.min ?? 1) || r.points > (rule.max ?? 3)) out.push(`${c.id}: ${vital} ${c.vitals[vital]} breaks rule ${JSON.stringify(rule)} for "${c.complaint}"`);
  }
  return out;
}

export function validateCase(c) {
  const p = [];
  const need = ['id', 'category', 'ageBand', 'complaint', 'flags', 'vitals', 'score', 'truthZone', 'difficulty', 'whyLine'];
  for (const k of need) if (!(k in c)) p.push(`${c.id ?? '?'}: missing ${k}`);
  if (p.length) return p;
  if (!advisorData.categories.includes(c.category)) p.push(`${c.id}: bad category ${c.category}`);
  if (!['adult', 'senior', 'child'].includes(c.ageBand)) p.push(`${c.id}: bad ageBand`);
  if (!ZONES.includes(c.truthZone)) p.push(`${c.id}: bad truthZone`);
  if (![1, 2, 3].includes(c.difficulty)) p.push(`${c.id}: bad difficulty`);
  if (c.complaint.length > 80 || !SAFE_TEXT.test(c.complaint)) p.push(`${c.id}: complaint length/characters`);
  if (c.whyLine.length > 200) p.push(`${c.id}: whyLine too long`);
  for (const v of ['pulse', 'sbp', 'dbp', 'spo2', 'temp']) if (typeof c.vitals[v] !== 'number') p.push(`${c.id}: vitals.${v}`);
  if (!p.length) {
    const t = triageScore(c.vitals, c.flags, c.ageBand);
    if (t.zone !== c.truthZone) p.push(`${c.id}: truthZone ${c.truthZone} != rubric ${t.zone}`);
    if (t.score !== c.score) p.push(`${c.id}: score ${c.score} != rubric ${t.score}`);
    if (t.difficulty !== c.difficulty) p.push(`${c.id}: difficulty mismatch`);
    if (whyLine(t) !== c.whyLine) p.push(`${c.id}: whyLine mismatch`);
    p.push(...plausibility(c));
  }
  return p;
}

export function validateCases(cases) {
  const problems = [];
  const expected = Object.values(caseTemplates.plan).reduce((s, z) => s + Object.values(z).reduce((a, b) => a + b, 0), 0);
  if (cases.length !== expected) problems.push(`expected ${expected} cases, got ${cases.length}`);
  const ids = new Set();
  const sigs = new Set();
  const zoneCount = { green: 0, amber: 0, red: 0 };
  const catCount = {};
  let borderline = 0;
  for (const c of cases) {
    problems.push(...validateCase(c));
    if (ids.has(c.id)) problems.push(`${c.id}: duplicate id`);
    ids.add(c.id);
    const sig = `${c.complaint}|${JSON.stringify(c.vitals)}`;
    if (sigs.has(sig)) problems.push(`${c.id}: duplicate case`);
    sigs.add(sig);
    zoneCount[c.truthZone] = (zoneCount[c.truthZone] ?? 0) + 1;
    catCount[c.category] = (catCount[c.category] ?? 0) + 1;
    if (c.difficulty === 3) borderline++;
  }
  const planZones = { green: 0, amber: 0, red: 0 };
  for (const z of Object.values(caseTemplates.plan)) for (const [k, v] of Object.entries(z)) planZones[k] += v;
  for (const z of Object.keys(planZones)) if (zoneCount[z] !== planZones[z]) problems.push(`zone ${z}: ${zoneCount[z]} != ${planZones[z]}`);
  for (const [cat, z] of Object.entries(caseTemplates.plan)) {
    const want = Object.values(z).reduce((a, b) => a + b, 0);
    if (catCount[cat] !== want) problems.push(`category ${cat}: ${catCount[cat]} != ${want}`);
  }
  if (borderline < 8) problems.push(`only ${borderline} borderline cases (need >= 8)`);
  return problems;
}
