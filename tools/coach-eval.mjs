// T16: coach prompt evaluation.
// Sends the 30 golden fact sets in tools/coach-golden-facts.json through the proxy's own
// provider code (server/coach-proxy/provider.ts: same system prompt, same request, same
// reply parsing), checks every reply with validateCoachText and then with the number guard
// (src/coach/numberGuard.ts), exactly as the Worker and the game do, and writes the replies
// and both verdicts to submission/coach-eval/report.md for a human spot check.
//
//   COACH_API_KEY=... COACH_MODEL=... node tools/coach-eval.mjs      (set them in your own shell)
//   node tools/coach-eval.mjs --dry-run     no network, no environment read: compiles the
//                                           provider and validates the 30 fact sets only
//   --pace <ms>    wait between requests (default 4500, which keeps 30 calls under a
//                  15-requests-per-minute free tier)
//   --out <file>   write the report somewhere other than submission/coach-eval/report.md
//
// A failed call is logged with its numeric HTTP status only. A 429 is retried once, after
// the wait the response states (Retry-After header, or the retry delay in the error
// details) or 5 s if it states none.
//
// The key and the model id are read from the environment, handed to the provider, and
// never printed, logged or written to the report. Each call has the proxy's 3 s limit.
import ts from 'typescript';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const DEFAULT_PACE_MS = 4500; // 30 calls in about 2.5 minutes: under 15 requests per minute
const RETRY_FALLBACK_MS = 5000;
const RETRY_MAX_MS = 60000;

function option(name) {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
}
const paceArg = option('--pace');
const PACE_MS = paceArg === undefined ? DEFAULT_PACE_MS : Number(paceArg);
if (!Number.isInteger(PACE_MS) || PACE_MS < 0 || PACE_MS > 600000) {
  console.error('--pace needs a whole number of milliseconds between 0 and 600000.');
  process.exit(2);
}
const outArg = option('--out');
if (process.argv.includes('--out') && !outArg) {
  console.error('--out needs a file path.');
  process.exit(2);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The provider reports the HTTP status but not how long a 429 asks us to wait. This wrapper
// notes that one number from the response and nothing else. It never logs or keeps the
// request, the response body or any header value other than the delay.
let statedRetryMs = null;
const upstreamFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const response = await upstreamFetch(...args);
  statedRetryMs = null;
  if (response.status === 429) {
    try {
      const header = response.headers.get('retry-after');
      if (header && /^\d+(\.\d+)?$/.test(header.trim())) {
        statedRetryMs = Number(header) * 1000;
      } else if (header && !Number.isNaN(Date.parse(header))) {
        statedRetryMs = Math.max(0, Date.parse(header) - Date.now());
      } else {
        const details = (await response.clone().json())?.error?.details;
        for (const d of Array.isArray(details) ? details : []) {
          const match = typeof d?.retryDelay === 'string' ? /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay) : null;
          if (match) statedRetryMs = Number(match[1]) * 1000;
        }
      }
    } catch {
      statedRetryMs = null;
    }
  }
  return response;
};
const SPOT_CHECKS = 10;

function compile() {
  const output = mkdtempSync(join(tmpdir(), 'second-opinion-coach-eval-'));
  const program = ts.createProgram(
    [join(root, 'server/coach-proxy/provider.ts'), join(root, 'src/core/coach.ts'), join(root, 'src/core/data.ts'),
      join(root, 'src/coach/numberGuard.ts')],
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
    guard: require(join(output, 'src/coach/numberGuard.js')),
    config: require(join(output, 'src/core/data.js')).coachConfig,
  };
}

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

const { output, provider, coach, guard, config } = compile();
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
      // One call with the proxy's time limit. Returns the numeric HTTP status (null if no
      // response arrived) and a problem description built from fixed words: never the key,
      // the request, the response body or an error message.
      const callOnce = async (facts) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.limits.timeoutMs);
        const trace = {};
        const t0 = performance.now();
        let reply;
        let problem = '';
        try {
          reply = await provider.callGemini(facts, env, controller.signal, trace);
        } catch (error) {
          problem = `request failed (${error?.name ?? 'error'})`;
        } finally {
          clearTimeout(timer);
        }
        const ms = Math.round(performance.now() - t0);
        const status = Number.isInteger(trace.upstream) ? trace.upstream : null;
        if (!problem && typeof reply !== 'string') {
          if (controller.signal.aborted) problem = `no reply within ${config.limits.timeoutMs} ms`;
          else if (status !== null && (status < 200 || status > 299)) problem = `HTTP ${status}`;
          else if (trace.reason === 'upstream_truncated') problem = `reply cut off at the token cap (HTTP ${status})`;
          else if (trace.reason === 'not_configured') problem = 'key or model refused before sending';
          else if (trace.stage === 'fetch') problem = `no HTTP response (${trace.err ?? 'error'})`;
          else problem = `no usable text (HTTP ${status ?? 'none'})`;
        }
        return { reply, problem, status, ms };
      };
      console.log(`Pace: ${PACE_MS} ms between requests.`);
      const rows = [];
      for (let i = 0; i < golden.length; i++) {
        const facts = golden[i];
        let { reply, problem, status, ms } = await callOnce(facts);
        if (status === 429) {
          const wait = Math.min(RETRY_MAX_MS, Math.max(1000, Math.round(statedRetryMs ?? RETRY_FALLBACK_MS)));
          console.log(`${String(i + 1).padStart(2)}/30 HTTP 429: one retry after ${wait} ms (${statedRetryMs === null ? 'no wait stated' : 'wait stated by the response'})`);
          await sleep(wait);
          ({ reply, problem, status, ms } = await callOnce(facts));
          if (problem) problem += ' after one retry';
        }
        if (problem) console.log(`${String(i + 1).padStart(2)}/30 call failed: ${status === null ? 'no HTTP response' : `HTTP ${status}`}`);
        const verdict = problem ? { ok: false, reason: problem } : coach.validateCoachText(reply, facts);
        // The number guard runs on the validated text, as in the Worker and the client.
        // "n/a" when there is nothing to check (no reply, or the validator already refused it).
        const numbers = verdict.ok ? guard.checkCoachNumbers(verdict.text, facts) : null;
        const shown = verdict.ok && numbers.ok;
        rows.push({
          n: i + 1, facts, reply: typeof reply === 'string' ? reply : '', ms,
          ok: verdict.ok, reason: verdict.ok ? '' : verdict.reason,
          guard: numbers === null ? 'n/a' : numbers.ok ? 'pass' : 'FAIL', guardReason: numbers && !numbers.ok ? numbers.reason : '',
          shown,
        });
        console.log(`${String(i + 1).padStart(2)}/30 validator ${verdict.ok ? 'pass' : 'FAIL'}, guard ${rows[i].guard}, ${shown ? 'shown' : 'TEMPLATE'} ${ms} ms${shown ? '' : ` (${verdict.ok ? numbers.reason : verdict.reason})`}`);
        if (i < golden.length - 1) await sleep(PACE_MS);
      }

      const passed = rows.filter((r) => r.ok).length;
      const guardFailed = rows.filter((r) => r.guard === 'FAIL').length;
      const shownCount = rows.filter((r) => r.shown).length;
      const fallback = rows.length - shownCount;
      const rate = Math.round((shownCount / rows.length) * 100);
      const reasons = {};
      for (const r of rows.filter((x) => !x.shown)) {
        const why = r.ok ? `number guard: ${r.guardReason}` : r.reason;
        reasons[why] = (reasons[why] ?? 0) + 1;
      }
      // Spot-check list: two per headline, taken from replies that passed (those are the ones a player would see).
      const spot = [];
      for (const headline of config.allowed.headline) {
        spot.push(...rows.filter((r) => r.shown && r.facts.headline === headline).slice(0, 2));
      }
      for (const r of rows) if (spot.length < SPOT_CHECKS && r.shown && !spot.includes(r)) spot.push(r);
      spot.length = Math.min(spot.length, SPOT_CHECKS);
      const slowest = Math.max(...rows.map((r) => r.ms));

      const lines = [
        '# Coach prompt evaluation (T16)',
        '',
        `Run on ${new Date().toISOString().slice(0, 10)} with \`node tools/coach-eval.mjs\`: the 30 fact sets in \`tools/coach-golden-facts.json\`, sent one at a time through the proxy's provider code with the system prompt from \`data/coach-prompt.json\` (version ${config.version}) and the proxy's ${config.limits.timeoutMs} ms limit. The model is the one named by \`COACH_MODEL\` in the shell that ran this; the key and the model id are not recorded here.`,
        '',
        `**Shown to the player: ${shownCount} of ${rows.length} (${rate}%). Would fall back to the template: ${fallback}.** The target is 95% shown. Slowest call: ${slowest} ms.`,
        '',
        `- validateCoachText: ${passed} of ${rows.length} passed.`,
        `- Number guard (\`src/coach/numberGuard.ts\`), run on the ${passed} that passed: ${guardFailed} rejected.`,
        '- A reply that fails either check is never shown: the game shows the template text instead.',
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
        spot.length < SPOT_CHECKS ? `Only ${spot.length} replies passed both checks, so there are fewer than ${SPOT_CHECKS} to check.\n` : '',
        '## All replies',
        '| # | Headline | Validator | Number guard | Player sees | Reason | ms | Reply | Facts |',
        '|---|---|---|---|---|---|---|---|---|',
        ...rows.map((r) => `| ${r.n} | ${r.facts.headline} | ${r.ok ? 'pass' : '**FAIL**'} | ${r.guard === 'FAIL' ? '**FAIL**' : r.guard} | ${r.shown ? 'coach text' : 'template'} | ${cell(r.ok ? r.guardReason : r.reason)} | ${r.ms} | ${cell(r.reply) || '(none)'} | \`${cell(JSON.stringify(r.facts))}\` |`),
        '',
      ];
      const reportPath = outArg ? resolve(outArg) : join(root, 'submission/coach-eval/report.md');
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, lines.join('\n'));
      console.log(`${shownCount}/${rows.length} shown (${rate}%), ${fallback} would fall back to the template (validator failed ${rows.length - passed}, number guard failed ${guardFailed}). Report: ${outArg ?? 'submission/coach-eval/report.md'}`);
      if (rate < 95) process.exitCode = 1;
    }
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
