# T15 · AI coach client and serverless proxy

**Agent:** GPT-6 Astra (Codex) · **When:** D4 Fri 13 Nov

**Goal:** A safe optional AI coach: a typed client with a 3 s timeout and a serverless proxy that validates facts, calls one LLM provider, validates the reply, and falls back cleanly.

## Inputs (read first)
- docs/12-ai-coach-spec.md (all)
- core-spec/src/coach.js and core-spec/test/coach.test.js
- data/coach-prompt.json
- src/core (the TypeScript port from T02)

## Allowed files (edit only these)
- src/core/coach.ts
- src/coach/**
- server/coach-proxy/**
- tests/coach*.test.ts
- server/coach-proxy/.env.example

## Steps
1. Port core-spec/src/coach.js to src/core/coach.ts with the same exports and add the 7 tests to Vitest. Import data/coach-prompt.json, do not copy values.
2. Write src/coach/coachClient.ts: askCoach(facts, debrief) does one POST to the proxy URL from config with an AbortController timeout of limits.timeoutMs, then returns chooseCoachText(). It must never throw and must return the template text on any failure, including offline.
3. Write server/coach-proxy: a handler for Cloudflare Workers or a Vercel function (keep the provider call in one file, provider.ts, so Vinay can pick Gemini, Anthropic or OpenAI). Steps in order: check kill switch COACH_ENABLED, check Origin against COACH_ALLOWED_ORIGINS, reject bodies over limits.maxBodyBytes, validateCoachFacts, rate limit per IP (best effort), call the provider with the fixed system prompt and max output tokens from the config, validateCoachText on the reply, return {text} or 204.
4. Secrets only from environment variables: COACH_API_KEY, COACH_MODEL, COACH_ALLOWED_ORIGINS, COACH_ENABLED. Add .env.example with placeholders. Never log request bodies.
5. Tests with a mocked provider: bad origin, oversize body, bad facts, kill switch, provider error, model text that fails validation, success. Client tests: success, 500, malformed JSON, slow response over 3 s, offline.
6. Write server/coach-proxy/README.md with deploy steps and a note to verify the host's current free-tier limits, and to set a spend cap in the provider console.

## Acceptance (must all pass)
- [ ] npm test passes, including the 7 coach tests and the new client and proxy tests
- [ ] grep finds no API key or provider secret in the repo or the client bundle
- [ ] Client returns template text within 3.2 s for every failure case

## Do not
- Do not call the provider from the client
- Do not add any free-text field to the facts
- Do not touch src/scene, src/ui or src/game
- Do not choose a model name you cannot verify, read it from COACH_MODEL

## Report format
Test output, the list of environment variables, and the deploy README.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T15: AI coach client and serverless proxy.
Goal: A safe optional AI coach: a typed client with a 3 s timeout and a serverless proxy that validates facts, calls one LLM provider, validates the reply, and falls back cleanly.
Inputs: docs/12-ai-coach-spec.md (all); core-spec/src/coach.js and core-spec/test/coach.test.js; data/coach-prompt.json; src/core (the TypeScript port from T02).
Allowed files: src/core/coach.ts; src/coach/**; server/coach-proxy/**; tests/coach*.test.ts; server/coach-proxy/.env.example.
Steps:
1. Port core-spec/src/coach.js to src/core/coach.ts with the same exports and add the 7 tests to Vitest. Import data/coach-prompt.json, do not copy values.
2. Write src/coach/coachClient.ts: askCoach(facts, debrief) does one POST to the proxy URL from config with an AbortController timeout of limits.timeoutMs, then returns chooseCoachText(). It must never throw and must return the template text on any failure, including offline.
3. Write server/coach-proxy: a handler for Cloudflare Workers or a Vercel function (keep the provider call in one file, provider.ts, so Vinay can pick Gemini, Anthropic or OpenAI). Steps in order: check kill switch COACH_ENABLED, check Origin against COACH_ALLOWED_ORIGINS, reject bodies over limits.maxBodyBytes, validateCoachFacts, rate limit per IP (best effort), call the provider with the fixed system prompt and max output tokens from the config, validateCoachText on the reply, return {text} or 204.
4. Secrets only from environment variables: COACH_API_KEY, COACH_MODEL, COACH_ALLOWED_ORIGINS, COACH_ENABLED. Add .env.example with placeholders. Never log request bodies.
5. Tests with a mocked provider: bad origin, oversize body, bad facts, kill switch, provider error, model text that fails validation, success. Client tests: success, 500, malformed JSON, slow response over 3 s, offline.
6. Write server/coach-proxy/README.md with deploy steps and a note to verify the host's current free-tier limits, and to set a spend cap in the provider console.
Acceptance: npm test passes, including the 7 coach tests and the new client and proxy tests | grep finds no API key or provider secret in the repo or the client bundle | Client returns template text within 3.2 s for every failure case
Do not: Do not call the provider from the client | Do not add any free-text field to the facts | Do not touch src/scene, src/ui or src/game | Do not choose a model name you cannot verify, read it from COACH_MODEL
Report: Test output, the list of environment variables, and the deploy README.
```
