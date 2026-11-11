// T16: coach prompt evaluation.
// Sends the 30 golden fact sets in tools/coach-golden-facts.json through the proxy's own
// provider code (server/coach-proxy/provider.ts: same system prompt, same request, same
// reply parsing), checks every reply with validateCoachText, and writes the replies and
// pass/fail to submission/coach-eval/report.md for a human spot check.
//
//   COACH_API_KEY=... COACH_MODEL=... node tools/coach-eval.mjs      (set them in your own shell)
//   node tools/coach-eval.mjs --dry-run     no network, no environment read: compiles the
//                                           provider and validates the 30 fact sets only
//
// The key and the model id are read from the environment, handed to the provider, and
// never printed, logged or written to the report. Each call has the proxy's 3 s limit.
import ts from 'typescript';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const PAUSE_MS = 1200; // between calls, to stay under provider rate limits
const SPOT_CHECKS = 10;

function compile() {
  const output = mkdtempSync(join(tmpdir(), 'second-opinion-coach-eval-'));
  const program = ts.createProgram(
    [join(root, 'server/coach-proxy/provider.ts'), join(root, 'src/core/coach.ts'), join(root, 'src/core/data.ts')],
    {
      target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10,
      strict: true, resolveJsonModule: true, esModuleInterop: true, noEmitOnError: true, skipLibCheck: true,
      types: [], lib: ['lib.es2021.d.ts', 'lib.dom.d.ts'], rootDir: root, outDir: output,
    },
  );
  const diagnostics = [...ts.getPreEmitDiagnostics(program)];
  const emitted = program.emit();
  diagnostics.push(...emitted.diagnostics);
  if (diagnostics.length || emitted.emitSkipped) {
    rmSync(output, { recursive: true, force: true });
    throw new Error(ts.formatDiagnostics(diagnostics, {
      getCurrentDirectory: () => root, getCanonicalFileName: (name) => name, getNewLine: () => '\n',
    }) || 'compilation did not emit JavaScript');
  }
  writeFileSync(join(output, 'package.json'), '{"type":"commonjs"}\n');
  const require = createRequire(import.meta.url);
  return {
    output,
    provider: require(join(output, 'server/coach-proxy/provider.js')),
    coach: require(join(output, 'src/core/coach.js')),
    config: require(join(output, 'src/core/data.js')).coachConfig,
  };
}

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

const { output, provider, coach, config } = compile();
try {
  const golden = JSON.parse(readFileSync(join(root, 'tools/coach-golden-facts.json'), 'utf8')).facts;
  if (!Array.isArray(golden) || golden.length !== 30) throw new Error(`expected 30 fact sets, found ${golden?.length}`);
  golden.forEach((facts, i) => {
    const v = coach.validateCoachFacts(facts);
    if (!v.ok) throw new Error(`fact set ${i + 1} fails validateCoachFacts: ${v.reason}`);
  });
  const coverage = {};
  for (const f of golden) coverage[f.headline] = (coverage[f.headline] ?? 0) + 1;
  console.log(`30 fact sets pass validateCoachFacts. Headlines: ${JSON.stringify(coverage)}`);

  if (dryRun) {
    const request = provider.geminiRequest(golden[0]);
    console.log(`dry run: provider compiled; request has the system prompt (${request.systemInstruction.parts[0].text.length} characters) and maxOutputTokens ${request.generationConfig.maxOutputTokens}. No request sent, no environment read.`);
  } else {
    const env = { COACH_API_KEY: process.env.COACH_API_KEY, COACH_MODEL: process.env.COACH_MODEL };
    const missing = Object.entries(env).filter(([, v]) => !v || !v.trim()).map(([k]) => k);
    if (missing.length) {
      console.error(`Not run: ${missing.join(' and ')} not set in this shell. Nothing was sent.`);
      process.exitCode = 2;
    } else {
      const rows = [];
      for (let i = 0; i < golden.length; i++) {
        const facts = golden[i];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.limits.timeoutMs);
        const t0 = performance.now();
        let reply;
        let problem = '';
        try {
          reply = await provider.callGemini(facts, env, controller.signal);
        } catch (error) {
          // Name only: a provider error message could echo request details.
          problem = controller.signal.aborted ? `no reply within ${config.limits.timeoutMs} ms` : `request failed (${error?.name ?? 'error'})`;
        } finally {
          clearTimeout(timer);
        }
        const ms = Math.round(performance.now() - t0);
        if (!problem && reply === undefined) problem = 'provider returned no text (HTTP error, blocked, or not finished)';
        const verdict = problem ? { ok: false, reason: problem } : coach.validateCoachText(reply, facts);
        rows.push({ n: i + 1, facts, reply: typeof reply === 'string' ? reply : '', ok: verdict.ok, reason: verdict.ok ? '' : verdict.reason, ms });
        console.log(`${String(i + 1).padStart(2)}/30 ${verdict.ok ? 'pass' : 'FAIL'} ${ms} ms${verdict.ok ? '' : ` (${verdict.reason})`}`);
        if (i < golden.length - 1) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      }

      const passed = rows.filter((r) => r.ok).length;
      const rate = Math.round((passed / rows.length) * 100);
      const reasons = {};
      for (const r of rows.filter((x) => !x.ok)) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
      // Spot-check list: two per headline, taken from replies that passed (those are the ones a player would see).
      const spot = [];
      for (const headline of config.allowed.headline) {
        spot.push(...rows.filter((r) => r.ok && r.facts.headline === headline).slice(0, 2));
      }
      for (const r of rows) if (spot.length < SPOT_CHECKS && r.ok && !spot.includes(r)) spot.push(r);
      spot.length = Math.min(spot.length, SPOT_CHECKS);
      const slowest = Math.max(...rows.map((r) => r.ms));

      const lines = [
        '# Coach prompt evaluation (T16)',
        '',
        `Run on ${new Date().toISOString().slice(0, 10)} with \`node tools/coach-eval.mjs\`: the 30 fact sets in \`tools/coach-golden-facts.json\`, sent one at a time through the proxy's provider code with the system prompt from \`data/coach-prompt.json\` (version ${config.version}) and the proxy's ${config.limits.timeoutMs} ms limit. The model is the one named by \`COACH_MODEL\` in the shell that ran this; the key and the model id are not recorded here.`,
        '',
        `**Automatic check (validateCoachText): ${passed} of ${rows.length} passed (${rate}%).** The target is 95%. A failed reply is never shown to a player: the game shows the template text instead. Slowest call: ${slowest} ms.`,
        '',
        Object.keys(reasons).length ? '## Failure reasons' : '## Failure reasons\nNone.',
        ...Object.entries(reasons).map(([reason, count]) => `- ${count} × ${reason}`),
        '',
        '## Spot check (for a person)',
        'The automatic check cannot judge tone or meaning. Read these and fill in the last column: does the reply scold, state a number wrongly (right number, wrong meaning), sound clinical, drift off topic, or contradict the facts?',
        '',
        '| # | Facts | Reply | OK? (owner) |',
        '|---|---|---|---|',
        ...spot.map((r) => `| ${r.n} | \`${cell(JSON.stringify(r.facts))}\` | ${cell(r.reply)} | |`),
        '',
        spot.length < SPOT_CHECKS ? `Only ${spot.length} replies passed, so there are fewer than ${SPOT_CHECKS} to check.\n` : '',
        '## All replies',
        '| # | Headline | Result | Reason | ms | Reply | Facts |',
        '|---|---|---|---|---|---|---|',
        ...rows.map((r) => `| ${r.n} | ${r.facts.headline} | ${r.ok ? 'pass' : '**FAIL**'} | ${cell(r.reason)} | ${r.ms} | ${cell(r.reply) || '(none)'} | \`${cell(JSON.stringify(r.facts))}\` |`),
        '',
      ];
      const dir = join(root, 'submission/coach-eval');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'report.md'), lines.join('\n'));
      console.log(`${passed}/${rows.length} passed (${rate}%). Report: submission/coach-eval/report.md`);
      if (rate < 95) process.exitCode = 1;
    }
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
