// Deterministic case generator. Truth always comes from the rubric (never from an LLM).
import { caseTemplates } from './data.js';
import { makeRng } from './rng.js';
import { triageScore, whyLine, bandsWithPoints, limitsFor, TYPICAL_DIRECTION } from './rubric.js';

export function rulesFor(categoryCfg, template) {
  return { ...(categoryCfg.defaultVitalRules ?? {}), ...(template.vitalRules ?? {}) };
}

const VITALS = ['pulse', 'sbp', 'spo2', 'temp'];

function sampleVitals(rng, zone, ageBand, rules) {
  const limits = limitsFor(ageBand);
  const weights = caseTemplates.zoneSeverityWeights[zone];
  const out = {};
  for (const vital of VITALS) {
    const rule = rules[vital] ?? 'any';
    let bands;
    if (rule === 'normal') {
      bands = bandsWithPoints(vital, ageBand, 0);
    } else if (rule === 'any' || rule === 'mild') {
      let points = rng.weighted(weights);
      if (rule === 'mild') points = Math.min(1, points);
      bands = points === 0 ? bandsWithPoints(vital, ageBand, 0) : bandsWithPoints(vital, ageBand, points, TYPICAL_DIRECTION[vital]);
      if (!bands.length) bands = bandsWithPoints(vital, ageBand, 0);
    } else {
      const min = rule.min ?? 1;
      const max = rule.max ?? 3;
      const points = Math.min(max, Math.max(min, rng.weighted(weights)));
      bands = bandsWithPoints(vital, ageBand, points, rule.dir);
      for (let p = min; !bands.length && p <= max; p++) bands = bandsWithPoints(vital, ageBand, p, rule.dir);
      if (!bands.length) throw new Error(`No band satisfies rule ${JSON.stringify(rule)} for ${vital}`);
    }
    const [bLo, bHi] = rng.pick(bands);
    const lo = Math.max(bLo, limits[vital][0]);
    const hi = Math.min(bHi, limits[vital][1]);
    if (lo > hi) { out[vital] = Math.round((bLo + bHi) / 2); continue; }
    out[vital] = vital === 'temp' ? Math.round(rng.float(lo, hi) * 10) / 10 : rng.range(Math.ceil(lo), Math.floor(hi));
  }
  out.dbp = Math.max(30, Math.round(out.sbp * rng.float(0.58, 0.68)));
  return out;
}

function makeCase(rng, category, zone, usage) {
  const cfg = caseTemplates.categories[category];
  const allowed = cfg.templates.filter((t) => t.zones.includes(zone));
  const minUse = Math.min(...allowed.map((t) => usage.get(t.text) ?? 0));
  const pool = allowed.filter((t) => (usage.get(t.text) ?? 0) === minUse);
  const template = rng.pick(pool);
  const ageBand = rng.pick(cfg.ageBands);
  const dw = caseTemplates.difficultyWeights;
  const targetDiff = Number(['1', '2', '3'][rng.weighted([dw['1'], dw['2'], dw['3']])]);
  for (let tries = 0; tries < 800; tries++) {
    const vitals = sampleVitals(rng, zone, ageBand, rulesFor(cfg, template));
    const t = triageScore(vitals, template.flags, ageBand);
    if (t.zone !== zone) continue;
    if (t.difficulty !== targetDiff && tries < 400) continue;
    usage.set(template.text, (usage.get(template.text) ?? 0) + 1);
    return { category, ageBand, complaint: template.text, flags: template.flags.slice(), vitals, score: t.score, truthZone: t.zone, difficulty: t.difficulty, whyLine: whyLine(t) };
  }
  throw new Error(`Could not generate ${category}/${zone}`);
}

export function generateCases({ seed = 'second-opinion-v1' } = {}) {
  const rng = makeRng(seed, 'cases');
  const usage = new Map();
  const cases = [];
  for (const [category, plan] of Object.entries(caseTemplates.plan)) {
    for (const [zone, count] of Object.entries(plan)) {
      for (let k = 0; k < count; k++) cases.push(makeCase(rng, category, zone, usage));
    }
  }
  return rng.shuffle(cases).map((c, i) => ({ id: `c-${String(i + 1).padStart(3, '0')}`, ...c }));
}
