
---

# Second Opinion — project rules (appended to the IWSDK-generated AGENTS.md)

**What this is:** a seated, hands-only WebXR tabletop game for the Meta VR Start Developer Competition 2026 (Gaming track, New Experience). Player triages fictional patients, **commits first**, then hears AI advisors with hidden reliability, can spend limited verify tokens, and gets a calibration debrief. Read `docs/00` to `docs/02` once.

**Deadline:** Wed 18 Nov 2026, 12:00 PM PT (Thu 19 Nov 01:30 AM IST). Plan to submit by 18:00 IST on 18 Nov. After the feature freeze (Mon 16 Nov EOD) only bug fixes.

## Architecture rule (most important)
- `src/core/**` is **pure TypeScript**: no three, no @iwsdk, no DOM, no `Date`, no `Math.random`, no fs, no network. Time is passed in as `nowMs`. Randomness comes from `rng`.
- `src/game/**` (ECS adapters) call the runtime and render results. They never compute scores, advice or reliance.
- UI renders **only** `runtime.publicView(i)` and values returned by runtime methods. Advice must not be visible before `commit()`. Truth must not be visible before the patient resolves.
- No AI or network call in a per-frame `update`. The game must be fully playable offline.

## Ground truth
- `core-spec/` is the executable specification. `npm test` there must stay green (40 tests). The TypeScript port must pass the same tests and the parity script.
- Tuning numbers live in `data/*.json`. Do not hard-code them.
- Triage truth is computed by `triageScore()`; never by a model and never typed by hand. Cases are generated with `core-spec/tools/generate-cases.js` and checked with `validate-cases.js`. Run `simulate-balance.js` after any data change.

## IWSDK honesty rule
Use only APIs that appear in the IWSDK docs, the installed `.d.ts`, or the `@iwsdk/reference` MCP tools. If you need something undocumented (grab release, poke events, gaze/dwell, audio, UI kit names), **write `spikes/<id>.md` with what you tried and stop guessing**. See `docs/03-technical-spec.md` section 3.

## Interaction and accessibility rules
- Hands-only end to end. Poke to read/ask, pinch-grab and release over a tray to commit. Rays and gaze are alternatives.
- Seated, all interaction within about 60 cm. Essential UI in the central field of view.
- Trays are shape-coded: Red triangle, Amber diamond, Green circle, plus colour and a text label.
- Every sound has a visual twin. Never rely on colour alone.
- `localStorage` access is always try/catch with an in-memory fallback.

## Content and safety rules
- Fictional, abstract patients. No real people, brands, logos, or real patient data. Mild theme, no gore.
- No medical claims anywhere. The footer says: "Fictional game logic. Not medical advice."
- Original assets only, list every external asset in `CREDITS.md`.

## Workflow rules
- One agent, one lane, one worktree (see `docs/06-agent-playbook.md`). Stay inside your task card's **Allowed files**.
- Keep `main` buildable. Commit small. Tag gates: `gate1`, `gate2`, `submission-1`. Never deploy after `submission-1`.
- Before reporting done: run the Acceptance commands in your task card and paste the output. For UI changes include an MCP screenshot and the console log summary.
- Do not add features that are not in `docs/01-PRD.md`. Ask first.

## AI coach rules (optional feature)
- The LLM only narrates facts built by `buildCoachFacts`. It never decides truth, scores or advice, and it is never called per frame or without a player button press.
- Text from the model is shown only if it passes `validateCoachText`. The proxy accepts only facts that pass `validateCoachFacts`. Otherwise show the template text.
- API keys live only in server environment variables. Never commit or bundle a key.
- Spec: `docs/12-ai-coach-spec.md`. Config: `data/coach-prompt.json`.
