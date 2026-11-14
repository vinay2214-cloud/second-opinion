# Optional Gemini coach proxy (Cloudflare Worker)

The Worker accepts POST /coach with a versioned facts object, never free text.
Gemini only narrates those facts. Scoring, advice and truth stay in the pure core.
The provider HTTP call is confined to provider.ts: plain text generation with the
fixed system prompt and the facts JSON. No tools, no search grounding, no audio.

**State: prepared, not deployed.** Nothing here has run against Cloudflare or Gemini.

## Environment

| Variable | Where | Value |
| --- | --- | --- |
| COACH_ENABLED | wrangler.jsonc `vars` | `"true"`. Exactly true enables requests; any other value returns 503. |
| COACH_ALLOWED_ORIGINS | wrangler.jsonc `vars` | `https://vinay2214-cloud.github.io`. Comma-separated exact origins. No paths, trailing slash or wildcards. For local development add each http://localhost:PORT explicitly. |
| COACH_MODEL | wrangler.jsonc `vars` | `gemini-3.5-flash-lite`. An optional models/ prefix is accepted. |
| COACH_API_KEY | Worker secret | Lives only in the gitignored `.dev.vars` and in Cloudflare's secret store. Never in wrangler.jsonc, a VITE_ variable, a log or a commit. |
| VITE_COACH_PROXY_URL | GitHub repository variable (public game build) | Absolute HTTPS URL ending in /coach, see below. Empty means no coach button. |

The Worker receives environment bindings as the fetch handler's env argument.
It does not use process.env. The browser bundle only reads VITE_COACH_PROXY_URL.

## Deploy

You run every command in this section yourself. Wrangler is an operator tool and
is not in this game's dependencies (checked with 4.161.0 via npx).

Before the first deploy:

- In the Gemini console, set a project monthly spend cap and a 50% alert
  ([billing docs](https://ai.google.dev/gemini-api/docs/billing#project-spend-caps)).
  The per-IP limiter here is not a global budget.
- Check the current Workers free-tier limits
  ([limits docs](https://developers.cloudflare.com/workers/platform/limits/)).

Then:

```sh
cd server/coach-proxy
cp .dev.vars.example .dev.vars     # skip if .dev.vars already exists
# edit .dev.vars in your editor: COACH_API_KEY=<paste the key>   (one line, no quotes needed)
npx wrangler login                 # once, opens a browser
./deploy.sh
```

deploy.sh does this, in order:

1. Stops with an error if `.dev.vars` is missing or `COACH_API_KEY` is empty. The value is never printed.
2. Runs `npx wrangler deploy` (config and public vars from wrangler.jsonc).
3. Pipes the key from `.dev.vars` into `npx wrangler secret put COACH_API_KEY` on stdin. The key is not echoed and is never a command argument.
4. Prints `deployed` and the Worker URL (`https://second-opinion-coach.<your-subdomain>.workers.dev`).

Between steps 2 and 3 on a first deploy the Worker has no key, so it answers 204
(the game shows its template). Secrets survive later deploys.

### The URL the game calls

The Worker serves one route, `/coach`. Set the GitHub repository variable
(Settings, Secrets and variables, Actions, Variables) to the printed URL plus that route:

```
VITE_COACH_PROXY_URL=https://second-opinion-coach.<your-subdomain>.workers.dev/coach
```

`<your-subdomain>` is your Cloudflare account's workers.dev subdomain. HTTPS, no
trailing slash, no query. Then re-run the "Deploy to GitHub Pages" workflow.

### Four curl tests

Each POST that reaches the model counts against the limit of 12 per IP per hour.

```sh
URL=https://second-opinion-coach.<your-subdomain>.workers.dev/coach
FACTS='{"v":1,"headline":"overReliance","index":0,"disagreements":4,"overRelianceRate":100,"underRelianceRate":0,"verifyYield":null,"drift":{"advisor":"Dash","category":"children","noticed":false},"pressureDrop":false,"patterns":[{"kind":"followedTooOften","advisor":"Dash","category":"children","count":4,"of":4,"adviceRight":0}]}'
post() { curl -s -o /dev/null -w '%{http_code}\n' -X POST "$URL" -H "Origin: $1" -H 'Content-Type: application/json' -d "$FACTS"; }
```

1. **200, model text.** `post https://vinay2214-cloud.github.io` prints 200. Drop
   `-o /dev/null` to read the `{"text": ...}` body. A 204 here means the model's
   reply was slow, cut off or failed validation; try once more before digging.
2. **204, fallback.** Deploy once with a model name that does not exist, test, then restore:

   ```sh
   npx wrangler deploy --var COACH_MODEL:not-a-real-model
   post https://vinay2214-cloud.github.io      # 204, empty body: the game shows its template
   npx wrangler deploy                         # restores wrangler.jsonc values
   ```
3. **403, wrong origin.** `post https://example.com` prints 403.
4. **503, kill switch.**

   ```sh
   npx wrangler deploy --var COACH_ENABLED:false
   post https://vinay2214-cloud.github.io      # 503
   npx wrangler deploy                         # switch back on
   ```

   To keep the coach off for good, set `COACH_ENABLED` to `"false"` in wrangler.jsonc
   and deploy, or clear VITE_COACH_PROXY_URL and rebuild the game.

### Provider settings

Checked against the Gemini API reference on 13 Nov 2026: `gemini-3.5-flash-lite`
is listed as stable and supports thinking levels minimal to high, default minimal.
Thought tokens count against `maxOutputTokens` (150 here), so the request pins
`generationConfig.thinkingConfig.thinkingLevel` to `MINIMAL`, the lowest documented
level. `thinkingLevel` is for Gemini 3 or later; a model that rejects it, or rejects
`MINIMAL`, makes every request fall back to 204. The 3 s timeout, the token cap and
the template fallback are unchanged.

For local Wrangler, `npx wrangler dev` in this folder reads `.dev.vars`.

Never paste a real key into a report, test, terminal command argument or commit.
See [Cloudflare secret handling](https://developers.cloudflare.com/workers/configuration/secrets/)
and [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Game integration contract (T17 owns the button)

The public build value is consumed by src/coach/config.ts and coachClient.ts:

```sh
VITE_COACH_PROXY_URL=https://YOUR-WORKER.workers.dev/coach npm run build
```

Import COACH_AVAILABLE from src/coach/config.ts to decide whether to render
"Ask the coach"; false means no button. No request occurs on import or during a
frame update. On an explicit player press, pass facts from buildCoachFacts and
the shift's original debrief object to askCoach(facts, debrief). Keep that same
debrief object for the shift: it is the cache key, so concurrent/repeated presses
(including failures) send at most one POST. A new shift uses a new object.
The cache is a WeakMap and sends no identity value over the wire.

askCoach returns Promise<CoachText>: either {source: 'coach', text} or
{source: 'template', text, reason}. Show the existing template immediately.
Show model text only from this result. The consent and offline notices are
already in data/coach-prompt.json. Both client and Worker validate the reply.
The client deadline includes fetching and decoding the response body, and races
the work as well as aborting it. There are no retries.

T15 exposes this API and configuration; it does not modify src/game, src/ui or
src/scene. Button wiring, visible notices and headset/offline interaction QA are
T17 work.

## Verification

```sh
npm run --if-present typecheck
npm test
npx tsc --noEmit
node tools/parity.mjs
npx vitest run --config tests/vitest.config.ts --reporter=verbose tests/coach.test.ts tests/coachClient.test.ts tests/coachProxy.test.ts
```

Proxy tests live in tests/coachProxy.test.ts so the root npm test command
discovers them. All assertions use Vitest. Tests use an injected provider,
synthetic facts and no API key. The payload contract test checks the exact
configured system prompt and token cap without sending a provider request.

The seven core reference tests are ported unchanged in behavior. The existing
100-seed parity tool checks the original runtime surface; it excludes coach.
The additional tests cover both HTTP adapters, exact CORS, UTF-8 body limits,
chunked uploads, rate-limit expiry and real-time fallback within 3.2 seconds.

## Operational limits

The rate limiter allows 12 validated requests per IP per hour per Worker
isolate. It expires entries, bounds memory at 4096 buckets and fails closed
when full. Restarts and multiple isolates reset/split those counters. Cloudflare's
CF-Connecting-IP supplies the bucket; missing values share a bucket. Origin
checks are a browser safeguard, not authentication against arbitrary HTTP clients.

The Worker never logs request bodies, facts, prompt text, model responses or keys.
It writes one line per request: fixed codes, a numeric status and booleans only.

```
coach: reason=<code> upstream=<Gemini HTTP status or none> stage=<step or none> err=<error class or none> key_len_ok=<bool> key_prefix_ok=<bool> key_charset_ok=<bool>
```

- `stage` is the provider step that threw: build_url, build_headers, build_body, fetch or read_body.
  `err` is only the thrown value's class name (TypeError, DOMException, SyntaxError), never its message or stack.
- The three `key_*` flags describe the trimmed key's shape without revealing it: 39 characters long,
  starts with `AIza`, only letters, digits, `_` and `-`. All true is what a standard Gemini key looks like;
  a false flag is a hint, not proof, that the uploaded secret is wrong.
- A key is trimmed, then refused (reason=not_configured, no request sent) if it holds whitespace, a control
  or non-ASCII character, a quote, an asterisk or an angle bracket.
- The call to Gemini uses `redirect: 'manual'`. The Workers runtime throws on `redirect: 'error'` before
  sending anything; that was the cause of `reason=upstream_http upstream=none` on the first deploy.

| Code | HTTP | Meaning |
| --- | --- | --- |
| ok | 200 | Model text passed validation. |
| preflight | 204 | CORS preflight answered. |
| disabled | 503 | COACH_ENABLED is not exactly true. |
| bad_origin | 403 | Origin not in COACH_ALLOWED_ORIGINS. |
| bad_request | 403/404/405/415 | Wrong path, method, preflight or content type. |
| body_too_large | 413 | Over 2048 bytes. |
| bad_json, bad_facts | 400 | Body is not JSON, or fails validateCoachFacts. |
| rate_limited | 429 | Over 12 per IP per hour. |
| not_configured | 204 | COACH_API_KEY or COACH_MODEL missing, malformed or refused (see above). No request sent. |
| upstream_http | 204 | Gemini answered with a non-2xx status (shown in upstream), or no response arrived (upstream=none). |
| upstream_truncated | 204 | Gemini stopped at MAX_TOKENS: the 150-token cap, which includes thought tokens, cut the reply. |
| upstream_empty | 204 | Gemini answered 2xx with no usable text (blocked, no candidates, other finish reason), or its body was not JSON (stage=read_body). |
| upstream_timeout | 204 | No reply within 3 s. |
| text_rejected | 204 | The reply failed validateCoachText or the number guard (src/coach/numberGuard.ts: a number attached to a counting word must be a count in the facts). |
| fallback | 204 | Anything else (client went away, unexpected error). |

Observability stays disabled in the config, so lines are not stored. To watch them
live, run `npx wrangler tail` in this folder in one terminal and send the curl test
from another.
Provider errors, missing configuration, blocked/truncated/invalid output and
timeouts return 204. Guard failures return 400/403/404/405/413/415/429; the kill
switch returns 503. All client failures return the template.

No live Gemini call or Cloudflare deployment is part of the automated tests.
Human review of generated prose and verification of the account's model, limits,
latency, cap and key restrictions remain deployment/T16 checks. Validators reject
many unsafe outputs but do not prove that every accepted sentence is accurate.
