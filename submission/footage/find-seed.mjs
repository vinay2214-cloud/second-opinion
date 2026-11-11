// Seed hunt for the video (docs/09 section 5). Read-only: builds Module 3 shifts with the
// executable specification and lists seeds where
//   (a) Orator is the lead advisor on a patient and its call is wrong, and
//   (b) the drifted advisor leads a patient in its drifted category after the drift and is wrong.
// usage: node submission/footage/find-seed.mjs [seed ...]   (no arguments: scan ward-a..z, ward-1..300)
import { buildShift } from '../../core-spec/src/index.js';
import { loadCases } from '../../core-spec/src/data.js';

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => `ward-${c}`);
const numbers = Array.from({ length: 300 }, (_, i) => `ward-${i + 1}`);
const seeds = process.argv.length > 2 ? process.argv.slice(2) : [...letters, ...numbers];
const detail = process.argv.length > 2;
const hits = [];
for (const seed of seeds) {
  const shift = buildShift({ seed, cases: loadCases(), module: 'module3' });
  const d = shift.drift;
  const rows = shift.patients.map((p) => {
    const lead = p.advice[p.leadAdvisor];
    return { i: p.index + 1, lead: p.leadAdvisor, cat: p.case.category, truth: p.case.truthZone, call: lead.call, ok: lead.correct, surge: p.surge,
      drifted: !!d && p.leadAdvisor === d.advisorId && p.case.category === d.category && p.index >= d.atIndex };
  });
  const oratorWrong = rows.filter((r) => r.lead === 'orator' && !r.ok);
  const driftWrong = rows.filter((r) => r.drifted && !r.ok);
  const driftRightBefore = d ? rows.filter((r) => r.lead === d.advisorId && r.cat === d.category && r.i <= d.atIndex && r.ok) : [];
  if (detail) {
    console.log(`${seed}: drift ${d ? `${d.advisorId}/${d.category} from patient ${d.atIndex + 1}` : 'none'}`);
    for (const r of rows) console.log(`  P${String(r.i).padStart(2)} ${r.surge ? 'surge' : '     '} ${r.cat.padEnd(9)} truth ${r.truth.padEnd(5)} lead ${r.lead.padEnd(6)} says ${r.call.padEnd(5)} ${r.ok ? 'right' : 'WRONG'}${r.drifted ? '  (drifted)' : ''}`);
    for (const p of shift.patients) console.log(`  P${String(p.index + 1).padStart(2)} all advisors: ${Object.entries(p.advice).map(([id, a]) => `${id}=${a.call}${a.correct ? '' : '*'}`).join(' ')}`);
  }
  if (oratorWrong.length && driftWrong.length) {
    hits.push({ seed, drift: `${d.advisorId}/${d.category}`, oratorWrongAt: oratorWrong.map((r) => r.i), driftWrongAt: driftWrong.map((r) => r.i),
      driftRightBefore: driftRightBefore.map((r) => r.i), firstOrator: oratorWrong[0].i,
      clean: !oratorWrong[0].surge && !driftWrong[0].surge });
  }
}
if (!detail) {
  hits.sort((a, b) => (b.driftRightBefore.length > 0) - (a.driftRightBefore.length > 0) || b.clean - a.clean || a.firstOrator - b.firstOrator);
  console.log(`${hits.length} of ${seeds.length} seeds have both moments`);
  for (const h of hits.slice(0, 15)) console.log(JSON.stringify(h));
}
