// Compare the unmodified executable specification with a fresh compilation of the TS core.
// Approved purity check (caller-supplied calendar getters are allowed):
// grep -rnE "new Date|Date\.now|\bDate\(|Math\.random|from ['\"]fs|from ['\"]three|@iwsdk" src/core
// dailySeed accepts a structural CalendarValue; it never constructs or reads a clock.
import ts from 'typescript';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import * as reference from '../core-spec/src/index.js';
import * as coach from '../core-spec/src/coach.js';
import { loadCases as referenceCases, advisorData } from '../core-spec/src/data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'second-opinion-parity-'));
let diffs = 0;
let comparisons = 0;
let completedRuns = 0;
let successfulVerifies = 0;

function compare(label, actual, expected) {
  comparisons++;
  if (isDeepStrictEqual(actual, expected)) return;
  diffs++;
  if (diffs <= 10) console.error(`DIFF: ${label}`);
}

function compileCore() {
  // This compilation also proves the core needs neither browser nor Node globals.
  const program = ts.createProgram([join(root, 'src/core/index.ts'), join(root, 'src/core/data.ts')], {
    target: ts.ScriptTarget.ES2021,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    noEmitOnError: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2021.d.ts'],
    rootDir: root,
    outDir: output,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const emitted = program.emit();
  diagnostics.push(...emitted.diagnostics);
  if (diagnostics.length || emitted.emitSkipped) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    }) || 'Core compilation did not emit JavaScript');
  }
  writeFileSync(join(output, 'package.json'), '{"type":"commonjs"}\n');
  const require = createRequire(import.meta.url);
  return {
    core: require(join(output, 'src/core/index.js')),
    data: require(join(output, 'src/core/data.js')),
  };
}

function exerciseRuntime(port, specShift, tsShift, calm, seedIndex) {
  const advisorNames = Object.fromEntries(Object.entries(advisorData.advisors).map(([id, a]) => [id, a.name]));
  const spec = reference.createShiftRuntime({ shift: specShift, calm, advisorNames });
  const actual = port.createShiftRuntime({ shift: tsShift, calm, advisorNames });
  const label = `${specShift.seed}/${specShift.module}/${calm ? 'calm' : 'normal'}`;
  const zones = reference.ZONES;
  const speed = calm ? 1.5 : 1;
  const t0 = 1_000_000;
  const at = (seconds) => t0 + seconds * 1000;
  const call = (method, ...args) => {
    const expected = spec[method](...args);
    const result = actual[method](...args);
    compare(`${label}/${method}/${args.join(',')}`, result, expected);
    return expected;
  };
  const observe = (nowMs) => {
    compare(`${label}/tokens`, actual.tokens, spec.tokens);
    compare(`${label}/ended`, actual.ended, spec.ended);
    for (const method of ['elapsedSec', 'remainingSec', 'driftCue']) call(method, nowMs);
    for (const p of specShift.patients) {
      call('publicView', p.index);
      call('availableVerifiers', p.index);
    }
    call('log');
    call('score');
  };

  call('tick', at(0));
  call('commit', -1, 'amber', at(0));
  call('verify', 0, 'sage', at(0));
  call('finalize', 0, 'amber', at(0));
  observe(at(0));
  call('start', at(0));

  for (const p of specShift.patients) {
    const arrival = p.arrivalSec * speed;
    call('tick', at(arrival));
    observe(at(arrival));
    const strategy = (seedIndex + p.index) % 5;
    if (strategy === 0) continue; // uncommitted timeout
    const zone = zones[(seedIndex + p.index) % zones.length];
    const committed = call('commit', p.index, zone, at(arrival + 1));
    if (!committed.ok) continue; // e.g. calm-mode arrivals beyond the hard cap
    call('commit', p.index, zone, at(arrival + 1)); // repeated commit guard
    call('verify', p.index, p.leadAdvisor, at(arrival + 1));
    call('verify', p.index, 'not-in-lineup', at(arrival + 1));
    observe(at(arrival + 1));

    let final = strategy === 2 ? committed.lead.call : zone;
    if (strategy === 3 || strategy === 4) {
      // Query all choices once to cover spending the last token and repeated verification.
      for (const id of call('availableVerifiers', p.index)) {
        const checked = call('verify', p.index, id, at(arrival + 2));
        if (checked.ok) {
          successfulVerifies++;
          final = checked.advice.call;
        }
        call('verify', p.index, id, at(arrival + 2));
      }
    }
    if (strategy === 4) final = zones.find((z) => z !== zone && z !== committed.lead.call) ?? zone;
    if (strategy !== 1) { // committed auto-keep at the deadline
      call('finalize', p.index, final, at(arrival + 3));
      call('finalize', p.index, final, at(arrival + 3));
    }
    observe(at(arrival + 3));
  }
  const end = at(Math.max(specShift.estimatedEndSec * speed, specShift.hardCapSeconds) + 1);
  call('tick', end);
  call('tick', end); // drained events after ending
  observe(end);
  const summary = call('summary');
  compare(`${label}/all-patients-resolved`, summary.entries.length, specShift.patients.length);
  compare(`${label}/shift-ended`, spec.ended, true);
  completedRuns++;
}

try {
  const { core: port, data } = compileCore();
  compare('public exports', Object.keys(port).sort(), Object.keys(reference).filter((key) => !(key in coach)).sort());
  const specPool = referenceCases();
  const tsPool = data.loadCases();
  compare('case pool', tsPool, specPool);
  const copy = data.loadCases();
  copy[0].vitals.pulse++;
  compare('case pool ownership', data.loadCases(), specPool);

  for (let i = 0; i < 100; i++) {
    const seed = `parity-${i}`;
    const calendar = { getFullYear: () => 2026, getMonth: () => i % 12, getDate: () => 1 + i % 28 };
    compare(`${seed}/dailySeed`, port.dailySeed(calendar), reference.dailySeed(calendar));
    compare(`${seed}/generated cases`, port.generateCases({ seed }), reference.generateCases({ seed }));
    for (const module of ['module1', 'module2', 'module3']) {
      const specShift = reference.buildShift({ seed, cases: specPool, module });
      const tsShift = port.buildShift({ seed, cases: tsPool, module });
      compare(`${seed}/${module}/buildShift`, tsShift, specShift);
      for (const p of specShift.patients) {
        for (const advisorId of Object.keys(advisorData.advisors)) {
          for (const playerCommit of reference.ZONES) {
            const args = { seed, caseObj: p.case, advisorId, patientIndex: p.index, drift: specShift.drift, playerCommit };
            compare(`${seed}/${module}/${p.index}/${advisorId}/${playerCommit}/advice`, port.advise(args), reference.advise(args));
          }
        }
      }
      for (const calm of [false, true]) exerciseRuntime(port, specShift, tsShift, calm, i);
    }
  }
  if (completedRuns !== 600 || successfulVerifies === 0) throw new Error('Incomplete runtime parity coverage');
  console.log(`${diffs} diffs over 100 seeds`);
  console.log(`${completedRuns} runtime runs; ${successfulVerifies} successful verifies; ${comparisons} comparisons`);
  if (diffs) process.exitCode = 1;
} finally {
  rmSync(output, { recursive: true, force: true });
}
