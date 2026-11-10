// node tools/simulate-balance.js [days=300] [playerAccuracy=0.7]
// Balance gate: a calibrated player MUST beat both naive policies on outcome score AND Calibration index.
// If it does not, tune data/advisors.json and data/shift-config.json until it does.
import { loadCases } from '../src/data.js';
import { buildShift, makeRng, classifyReliance, calibrationIndex, outcomeScore, effectiveReliability, ZONES, zoneIndex } from '../src/index.js';

const DAYS = Number(process.argv[2] ?? 300);
const ACC = Number(process.argv[3] ?? 0.7);
const cases = loadCases();

const policies = {
  'always follow advice': () => 'follow',
  'never follow advice': () => 'hold',
  // Knows each advisor's true reliability at that moment (the thing a good player learns through play).
  'calibrated (oracle)': ({ patient, shift }) => {
    const r = effectiveReliability(patient.leadAdvisor, patient.case.category, patient.case.truthZone, patient.index, shift.drift);
    return r >= ACC ? 'follow' : 'hold';
  },
};

function run(policy) {
  let outcome = 0, idxSum = 0, idxN = 0, patientsN = 0;
  for (let d = 0; d < DAYS; d++) {
    const shift = buildShift({ seed: `sim-${d}`, cases, module: 'module3' });
    const rng = makeRng('player', d);
    const entries = [];
    for (const p of shift.patients) {
      const truth = p.case.truthZone;
      const t = zoneIndex(truth);
      const commit = rng.chance(ACC) ? truth : ZONES[Math.max(0, Math.min(2, t + (rng.chance(0.5) ? 1 : -1)))];
      const advice = p.advice[p.leadAdvisor];
      const final = policy({ patient: p, shift }) === 'follow' ? advice.call : commit;
      const e = { index: p.index, category: p.case.category, advisorId: p.leadAdvisor, commit, advice: advice.call, final, truth, surge: p.surge };
      e.reliance = classifyReliance(e);
      entries.push(e);
      outcome += outcomeScore({ final, truth, msToCommit: 10000 });
      patientsN++;
    }
    const c = calibrationIndex(entries);
    if (c.index !== null) { idxSum += c.index; idxN++; }
  }
  return { outcome: outcome / DAYS, index: idxSum / idxN };
}

const results = Object.entries(policies).map(([name, pol]) => [name, run(pol)]);
console.log(`player commit accuracy ${ACC}, ${DAYS} simulated shifts`);
for (const [name, r] of results) console.log(name.padEnd(24), 'outcome', r.outcome.toFixed(1).padStart(6), ' index', r.index.toFixed(1).padStart(5));
const [af, nf, cal] = results.map((r) => r[1]);
const pass = cal.outcome > af.outcome && cal.outcome > nf.outcome && cal.index > af.index && cal.index > nf.index;
console.log(pass ? 'BALANCE GATE: PASS' : 'BALANCE GATE: FAIL (tune advisors.json / shift-config.json)');
process.exit(pass ? 0 : 1);
