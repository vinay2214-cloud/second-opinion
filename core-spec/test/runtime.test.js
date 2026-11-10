import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShift, createShiftRuntime, outcomeScore, shiftScore, calibrationIndex } from '../src/index.js';
import { loadCases, shiftConfig } from '../src/data.js';

const POOL = loadCases();
const mk = (opts = {}) => {
  const shift = buildShift({ seed: 'rt-1', cases: POOL, module: 'module3' });
  const rt = createShiftRuntime({ shift, ...opts });
  return { shift, rt };
};
const T0 = 1_000_000;
const at = (sec) => T0 + sec * 1000;

test('runtime: patients arrive on schedule and view hides advice and truth before commit', () => {
  const { shift, rt } = mk();
  const first = shift.patients[0].arrivalSec;
  assert.deepEqual(rt.start(at(0)), []);
  const ev = rt.tick(at(first));
  assert.deepEqual(ev, [{ type: 'arrive', index: 0 }]);
  const v = rt.publicView(0);
  const json = JSON.stringify(v);
  assert.equal(v.status, 'arrived');
  assert.ok(!('lead' in v) && !('result' in v));
  for (const leak of ['truthZone', 'whyLine', '"score"', 'advice']) assert.ok(!json.includes(leak), `leaked ${leak} before commit`);
});

test('runtime: commit reveals the lead advice; truth stays hidden until finalize', () => {
  const { shift, rt } = mk();
  rt.start(at(0));
  rt.tick(at(shift.patients[0].arrivalSec));
  const c = rt.commit(0, 'amber', at(shift.patients[0].arrivalSec + 6));
  assert.equal(c.ok, true);
  assert.equal(c.lead.advisorId, shift.patients[0].leadAdvisor);
  const v = rt.publicView(0);
  assert.ok(v.lead && !('result' in v) && !JSON.stringify(v).includes('truthZone'));
  assert.equal(rt.commit(0, 'red', at(40)).ok, false, 'cannot commit twice');
  const f = rt.finalize(0, 'amber', at(shift.patients[0].arrivalSec + 8));
  assert.equal(f.ok, true);
  assert.equal(rt.publicView(0).result.truth, shift.patients[0].case.truthZone);
});

test('runtime: verify rules, token accounting and clock cost', () => {
  const { shift, rt } = mk();
  rt.start(at(0));
  rt.tick(at(shift.patients[0].arrivalSec));
  assert.equal(rt.verify(0, 'sage', at(10)).ok, false, 'must commit before verifying');
  rt.commit(0, 'amber', at(10));
  const lead = shift.patients[0].leadAdvisor;
  assert.equal(rt.verify(0, lead, at(11)).ok, false, 'lead advisor is already heard');
  const other = rt.availableVerifiers(0)[0];
  const before = rt.elapsedSec(at(12));
  const r = rt.verify(0, other, at(12));
  assert.equal(r.ok, true);
  assert.equal(rt.tokens, 3);
  assert.ok(Math.abs(rt.elapsedSec(at(12)) - before - shiftConfig.verify.clockCostSeconds) < 1e-9);
  assert.equal(rt.verify(0, other, at(13)).ok, false, 'no repeat verification');
});

test('runtime: tokens run out', () => {
  const { shift, rt } = mk();
  rt.start(at(0));
  let now = 0;
  let used = 0;
  for (let i = 0; i < 6 && used < 5; i++) {
    now = shift.patients[i].arrivalSec;
    rt.tick(at(now));
    rt.commit(i, 'amber', at(now + 1));
    for (const id of rt.availableVerifiers(i)) { const r = rt.verify(i, id, at(now + 2)); if (r.ok) used++; }
    rt.finalize(i, 'amber', at(now + 3));
  }
  assert.equal(rt.tokens, 0);
  assert.equal(used, 4);
});

test('runtime: timeout auto-ambers with a penalty and logs a missed window; committed patients auto-keep', () => {
  const { shift, rt } = mk();
  rt.start(at(0));
  const p0 = shift.patients[0];
  rt.tick(at(p0.arrivalSec));
  const ev = rt.tick(at(p0.arrivalSec + p0.windowSec));
  const r = ev.find((e) => e.type === 'resolved' && e.index === 0);
  assert.ok(r && r.missed);
  assert.equal(r.delta, outcomeScore({ final: 'amber', truth: p0.case.truthZone, missed: true }));
  const p1 = shift.patients[1];
  rt.tick(at(p1.arrivalSec));
  rt.commit(1, 'green', at(p1.arrivalSec + 2));
  const ev2 = rt.tick(at(p1.arrivalSec + p1.windowSec));
  const k = ev2.find((e) => e.type === 'resolved' && e.index === 1);
  assert.ok(k && !k.missed, 'a committed call is kept, not marked missed');
  assert.equal(rt.log()[1].final, 'green');
});

test('runtime: hard cap ends the shift and resolves everything', () => {
  const { shift, rt } = mk();
  rt.start(at(0));
  const ev = rt.tick(at(shiftConfig.shift.hardCapSeconds + 1));
  assert.ok(ev.some((e) => e.type === 'shiftEnd'));
  assert.equal(rt.log().length, shift.patients.length);
  assert.ok(rt.ended);
});

test('runtime: a complete scripted shift produces a consistent summary and debrief', () => {
  const { shift, rt } = mk({ advisorNames: { dash: 'Dash', sage: 'Sage', ledger: 'Ledger', orator: 'Orator' } });
  rt.start(at(0));
  for (const p of shift.patients) {
    rt.tick(at(p.arrivalSec));
    const lead = rt.commit(p.index, 'amber', at(p.arrivalSec + 5)).lead; // naive: everyone to Amber, then follow the lead advisor
    rt.finalize(p.index, lead.call, at(p.arrivalSec + 8));
  }
  rt.tick(at(shift.estimatedEndSec + 1));
  assert.ok(rt.ended);
  const s = rt.summary();
  assert.equal(s.entries.length, 14);
  assert.deepEqual(s.score, shiftScore(s.entries, rt.tokens));
  assert.equal(s.score.restraint, 4);
  assert.equal(s.debrief.index, calibrationIndex(s.entries).index);
  assert.ok(typeof s.debrief.headline === 'string' && s.debrief.headline.length > 0);
});

test('runtime: drift cue appears once the drift patient arrives', () => {
  const { shift, rt } = mk();
  rt.start(at(0));
  assert.equal(rt.driftCue(at(0)), null);
  const d = shift.drift;
  rt.tick(at(shift.patients[d.atIndex].arrivalSec));
  const cue = rt.driftCue(at(0));
  assert.equal(cue.advisorId, d.advisorId);
  assert.equal(cue.text, 'update installed');
});

test('runtime: calm mode slows arrivals and widens windows', () => {
  const shift = buildShift({ seed: 'rt-1', cases: POOL, module: 'module3' });
  const rt = createShiftRuntime({ shift, calm: true });
  rt.start(at(0));
  const base = shift.patients[1].arrivalSec;
  assert.equal(rt.tick(at(base)).filter((e) => e.type === 'arrive' && e.index === 1).length, 0);
  assert.equal(rt.tick(at(base * 1.5)).filter((e) => e.type === 'arrive' && e.index === 1).length, 1);
});
