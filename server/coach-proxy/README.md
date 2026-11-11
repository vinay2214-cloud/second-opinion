# Optional Gemini coach proxy (Cloudflare Worker)

The Worker accepts POST /coach with a versioned facts object, never free text.
Gemini only narrates those facts. Scoring, advice and truth stay in the pure core.
The provider HTTP call is confined to provider.ts. No model ID is supplied by the
repository: select and pin a verified model in your Gemini account.

## Environment

| Variable | Where | Value |
| --- | --- | --- |
| COACH_ENABLED | Worker binding | Exactly true enables requests; missing or any other value returns 503. |
| COACH_ALLOWED_ORIGINS | Worker binding | Comma-separated exact origins, for example https://game.example. No paths, trailing slash or wildcards. For local development list each http://localhost:PORT explicitly. |
| COACH_MODEL | Worker binding | Your verified, pinned Gemini model ID; an optional models/ prefix is accepted. No default. |
| COACH_API_KEY | Worker secret | Set interactively or in the host secret store. Never commit it or put it in a VITE_ variable. |
| VITE_COACH_PROXY_URL | Public game build only | Absolute HTTPS URL ending in /coach. Empty means the coach is unavailable and its button must be hidden. HTTP is accepted only for local loopback development. |

The Worker receives environment bindings as the fetch handler's env argument.
It does not use process.env. The browser bundle only reads VITE_COACH_PROXY_URL.

## Deploy (operator steps; T15 does not deploy)

Run these commands from the repository root. Wrangler is an operator tool; it is
not added to this game's dependencies. Review and pin the Wrangler version used
for your deployment.

1. Run the local checks below. Verify the host's **current free-tier limits** in
   [Cloudflare's limits documentation](https://developers.cloudflare.com/workers/platform/limits/).
   Check requests/day, CPU and memory limits for the plan you actually selected.
2. In the Gemini provider console, **set a project monthly spend cap**, configure
   a 50% alert, and verify it is enforced for your account. See the
   [Gemini billing documentation](https://ai.google.dev/gemini-api/docs/billing#project-spend-caps).
   Caps can have enforcement delays; an alerts-only budget does not stop spend.
   The per-IP limiter here is not a global budget.
3. Authenticate and deploy the initially disabled Worker:

   ```sh
   npx wrangler login
   npx wrangler deploy --config server/coach-proxy/wrangler.jsonc
   ```

   With no bindings, it returns 503 and never calls Gemini.
4. Set the key at the interactive prompt, never as a shell command argument:

   ```sh
   npx wrangler secret put COACH_API_KEY --config server/coach-proxy/wrangler.jsonc
   ```

   In the Cloudflare dashboard for this Worker, set COACH_MODEL and
   COACH_ALLOWED_ORIGINS as text environment bindings. Set COACH_ENABLED to false.
   The configuration uses keep_vars to preserve dashboard text bindings on
   subsequent deployments. Wrangler secret updates can deploy a new version;
   keep the switch disabled during setup.
5. Verify the chosen model supports the
   [Gemini generateContent API](https://ai.google.dev/api/generate-content),
   the fixed system instruction and the 150-token output budget from
   data/coach-prompt.json. Test one allowed-origin request using synthetic facts;
   confirm unknown origins, bad facts and oversized bodies are rejected. Enable
   COACH_ENABLED=true only after the spend cap and allowlist are set.
6. Test the kill switch: set COACH_ENABLED=false, confirm 503 and the client
   template fallback, then restore true if ready. Pin the model and prompt
   version before the feature freeze. Do not change a submitted build except
   to repair a breakage.

For local Wrangler, copy .env.example to **server/coach-proxy/.dev.vars**
(ignored by git), fill values privately, and run:

```sh
npx wrangler dev --config server/coach-proxy/wrangler.jsonc
```

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

The Worker never logs request bodies, model responses or keys. Observability is
disabled in its config; review host logging settings before enabling any logs.
Provider errors, missing configuration, blocked/truncated/invalid output and
timeouts return 204. Guard failures return 400/403/404/405/413/415/429; the kill
switch returns 503. All client failures return the template.

No live Gemini call or Cloudflare deployment is part of the automated tests.
Human review of generated prose and verification of the account's model, limits,
latency, cap and key restrictions remain deployment/T16 checks. Validators reject
many unsafe outputs but do not prove that every accepted sentence is accurate.
