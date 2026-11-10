# 12 · AI Calibration Coach specification

**Decision (9 Nov 2026, Vinay): keep it.** Build it properly, as a **SHOULD** feature with a hard safety design. **The LLM narrates facts. Code decides everything.**

## 1. My assessment (why it is worth keeping, and what could go wrong)

**Worth it because:**

- The debrief is the emotional payoff. A natural-language mirror of *your* pattern ("you followed Dash on children cases 4 of 4 times, and Dash was right 0 times") feels personal and premium.
- It gives the entry a real agent moment for the **Best Agentic Interaction** story, while the game stays deterministic (rule: "thin wrappers are highly discouraged", so the game must not depend on the LLM).
- It sits on the debrief panel, **not** in the commit loop, so it cannot hurt the first five minutes.

**What could go wrong, and the design answer:**

| Risk | Design answer |
|---|---|
| Judges play with no network, or the service is down | Template debrief always shows first. The coach is an **extra** line. Fallback text is instant |
| Wrong or invented numbers | The model may use **only numbers present in the facts JSON**. The client rejects anything else |
| Medical claims or off-topic text | Fixed system prompt, output validator with a blocklist, 70-word hard cap, fallback on any failure |
| Prompt injection through the API | The proxy accepts **only** a strict facts schema with enumerated strings. No free text can reach the prompt |
| API key leaked or cost abuse | Key lives only in the serverless function. Origin allowlist, rate limit, small body limit, provider spend cap, kill switch |
| Service must stay free and available until winners are announced (about 11 Dec) | Coach is optional. If the budget cap is hit or the proxy is off, the game shows the template text and works exactly as before |
| No changes allowed after the deadline | Pin the model and prompt version before 16 Nov. Do not edit the proxy after submitting unless it is broken |
| Latency in the headset | Never blocks. 3 s timeout. A thinking indicator, then text or fallback |
| It becomes a distraction and costs the core | **Cut rule:** if Gate 2 (Sat 14 Nov) is red, drop only the UI wiring. The tested core and proxy can wait |

## 2. Player experience

1. The debrief panel shows the template headline, index, findings and next step **immediately** (existing behaviour).
2. Below it: a button **"Ask the coach"**, with the small notice: *"Sends your shift summary numbers (no personal data) to an AI service."*
3. Poke (or dwell) the button. A small ring shows "Coach is thinking". After at most **3 s**:
   - success: a card labelled **"Coach (AI)"** with 2 to 3 sentences, or
   - failure: the template text with the line *"The coach is offline. Here is your summary."* No error screens.
4. One request per shift. The result is cached for that shift. The game works identically with the button never pressed.

## 3. Architecture

```
Debrief panel ──► buildCoachFacts()  (src/core/coach, pure)
                       │ plain facts JSON (no free text, no identifiers)
                       ▼
            coachClient.ts  fetch POST, 3 s AbortController
                       │ HTTPS
                       ▼
        Serverless proxy (Cloudflare Worker, Vercel function, or similar)
           1. check Origin allowlist (your Pages domain, localhost for dev)
           2. body ≤ 2 KB, validateCoachFacts() strict schema
           3. rate limit per IP, kill switch, optional cache by hash(facts)
           4. call the LLM API with the FIXED system prompt (data/coach-prompt.json)
           5. validateCoachText() on the reply, return {text} or 204
                       │
                       ▼
            client: chooseCoachText() → coach text if valid, else template
```

- **Provider:** use the cheapest fast model on an API **you already have a key for** (Gemini, Anthropic or OpenAI APIs all work). I cannot verify current model names or prices from here, so pick the model yourself and pin it.
- **Hosting:** a free tier of Cloudflare Workers, Vercel or Netlify functions is enough for this volume. Verify the limits when you set it up.
- **Shared code:** `validateCoachFacts` and `validateCoachText` live in `core-spec/src/coach.js` (tested). Port them to TypeScript and import them in **both** the client and the proxy so they cannot drift.
- **Config:** `data/coach-prompt.json` holds the prompt, limits, allowlists and blocklist. One source of truth.

## 4. Facts object (what leaves the device)

```json
{ "v": 1, "headline": "overReliance", "index": 0, "disagreements": 4,
  "overRelianceRate": 100, "underRelianceRate": 0, "verifyYield": null,
  "drift": { "advisor": "Dash", "category": "children", "noticed": false },
  "pressureDrop": false,
  "patterns": [ { "kind": "followedTooOften", "advisor": "Dash", "category": "children", "count": 4, "of": 4, "adviceRight": 0 } ] }
```

No names, no device ids, no timestamps, no free text. Every string is from an allowlist.

## 5. Prompt and output rules

The system prompt is in `data/coach-prompt.json` (read it, do not paraphrase it). Output rules enforced in code: 20 to 480 characters, at most 70 words (target 60), 1 to 4 sentences, no markup, no emoji, no URLs, **every number must appear in the facts**, none when `headline` is `notEnough`, and none of the blocked terms (diagnosis, treatment, dosage, symptom, clinical, "as an AI", prompt-leak phrases).

## 6. Security and cost checklist (proxy)

- [ ] API key stored as a server-side secret. **Never** in the repo or the client bundle.
- [ ] CORS and `Origin` allowlist: your Pages origin and `http://localhost:*` for dev only.
- [ ] Reject bodies over 2 KB and any facts that fail `validateCoachFacts`.
- [ ] Rate limit (starting value 12 requests per IP per hour, tune it). Best effort is fine.
- [ ] `max_tokens` about 150. Low temperature. Model and prompt version pinned.
- [ ] **Spend cap** set in the provider's console. Alert on 50 percent.
- [ ] Kill switch: an environment variable that makes the proxy return 503, so the client falls back.
- [ ] No logging of request bodies. Log only status and latency.
- [ ] Test the cap and the kill switch **before** the freeze.

## 7. Tests (all must pass)

| Test | Where |
|---|---|
| Facts builder, schema validator, text validator, fallback chooser (7 tests, **already written**) | `core-spec/test/coach.test.js` |
| Client: success, 500, malformed JSON, slow response over 3 s, offline | `tests/coachClient.test.ts` (task T15) |
| Proxy: bad origin, oversize body, bad facts, kill switch, provider error, invalid model text | `server/coach-proxy/tests` (task T15) |
| 30 golden fact sets, reply read by a human: 10 spot checks, zero medical claims, zero wrong numbers | Task T16 report |
| Airplane-mode full shift: debrief shows, button shows the fallback, no console errors | QA plan |
| Judge-style test: fresh profile, tap the coach once, see text within 3 s or the fallback | QA plan |

## 8. Schedule (so it cannot endanger Gate 2)

| When | What | Who |
|---|---|---|
| Fri 13 Nov | T15: coach client and proxy in their own lane. T16: golden fact sets and a prompt evaluation | GPT-6 Astra, Gemini 4 Argon |
| Sat 14 Nov | Deploy the proxy, set the spend cap, test the kill switch. **Gate 2 decides T17** | You, Astra |
| Sun 15 Nov | T17: wire the "Ask the coach" button into the debrief panel, then the 10-case human review | Claude Code, you |
| Mon 16 Nov | **Pin the model and prompt version.** Freeze | You |
| 17 to 18 Nov | Fresh-profile test includes one coach tap | You |
| Until about 11 Dec | Leave the proxy running. Do not change the game build | You |

## 9. Acceptance

- [ ] The game is identical with the coach off, offline, or failing.
- [ ] No coach request is ever made unless the player pressed the button.
- [ ] No text can appear that failed `validateCoachText`.
- [ ] The key is not in the repo, the bundle or the logs.
- [ ] The description and form say the coach is **optional** and send only summary numbers.
