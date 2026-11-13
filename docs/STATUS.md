# Status (scene lane, Claude Code; from 11 Nov also the former Argon cards T10, T11, T16)

Everything here is **emulator only** (IWSDK emulator, emulated hands). Nothing has been run on a Quest.
Evidence paths are under `spikes/evidence/`. Last update: Wed 11 Nov 2026.

## Where things stand
| Card | Result | Evidence |
|---|---|---|
| T01 scaffold and spikes | Done (tag `d0`) | `spikes/S1.md`, `S2.md`, `S7.md` |
| T03 ward and placement | Done | `T03-*.png`, `spikes/S4.md` |
| T04 token grab and trays | Done | `T04-*.png`, `spikes/S2b.md` |
| T06 Module 1 loop | Done (tag `gate1`) | `T06-*.png` |
| T07 verify, HUD, pause, debrief | Done | `T07-*.png` |
| T08 Module 3, surges, drift | Done | `T08-*.png`, `T08-10-seed-lengths.txt` |
| T12 accessibility and onboarding | Done, see below | `T12-*.png` |
| T09 trust map (Astra's model, my view) | Merged and shown on the debrief | `T09-debrief-review.png`, `T09-trust-map.png` |
| T10 sound | Brief written (`proposals/audio-brief.md`) and built: five synthesised cues, Sound toggle. Works in the emulator; **nobody has heard it** | `T10-*.png`, `spikes/S6.md` |
| T11 gap review | Done, see "Gap review" below | |
| T16 coach prompt evaluation | Tool and 30 fact sets written. **Not run**: waiting for the owner to say the key is set | `tools/coach-eval.mjs` |
| T14 polish, debug, safe mode | Done except the items listed below | `T14-*.png` |
| T15 coach client and proxy (Astra) | Merged into `main` (`0034e0a`). **Worker prepared, not deployed**; model `gemini-3.5-flash-lite`; key handling: `.dev.vars` (gitignored) -> wrangler secret. No proxy URL set. See "Worker deploy prep" below | `server/coach-proxy/README.md` |
| T17 coach button | Built; tested against a mock proxy only. Off in the live build until the owner sets `VITE_COACH_PROXY_URL` | `T17-*.png` |
| Stage D: QA, submission check, footage kit | D1 to D3 done; `rc1` tagged on the emulator bar (Stage 1). Footage now has the Orator and drift moments on seed `ward-128` | `submission/footage/` |

## A0 sync
- 10 Nov: `agent/core` had nothing after T05.
- 11 Nov: `agent/core` gained T09 (`fd93d53`) and the debrief copy fix (`be35fcb`). Trial merge on a throwaway branch: 93 tests passed, parity 0 diffs, tsc clean, build OK, core-spec 40/40. Merged into `main` with no conflicts. **T15 (coach) is not on the branch yet**, so Stage C is blocked.
- 11 Nov, later: `agent/core` gained T15 (`cd4c6fb` debrief copy, `efef0ac` coach client and Worker proxy). Trial merge on a throwaway branch: **133 tests passed, parity 0 diffs, tsc clean, build OK**, core-spec 40/40, no conflicts. Merged and pushed as `0034e0a`. The copy note at the bottom of this file ("daily shift") is fixed by `cd4c6fb`.
- The debrief now has two views: the review, and a trust map listing each observed advisor and category ("you followed 0 of 2, Dash was right 2"). The Keep button becomes Map / Review on the debrief.

## Gate 2 (11 Nov): green, tagged `gate2`
- Default settings: Module 2, 10 patients, 6 verifies, 20 s pause, hands only, debrief and trust map. Console `{"info":78}`, 0 errors, `[debrief] match=true`.
- Accessibility modes: Module 1 with one hand, calm, high contrast and big text together. 0 errors.
- Module 3: full played shift on the Gate 2 build, 14 patients, 4 verifies, both surges, drift cue at patient 9. Console `{"info":89}`, 0 errors, `[debrief] match=true`, ended at 6:22 shift time.
- Checks: 93 tests, parity 0 diffs, tsc clean, build OK.
- Live URL from a fresh profile: loads with 0 failed requests and 0 console errors. A shift cannot be played there from a desktop browser (no WebXR), so that part of the gate is covered by the local emulator only.
- Cut: gaze-dwell (S5 never run). Not cut but not built: coach button (waiting for T15), Echo (never in scope).
- Content freeze starts now: no new content or interaction types.

## T12 accessibility and onboarding
Acceptance:
- **Full shift with one hand, sound off, calm mode: pass.** Module 1, right hand only (left hand disconnected), calm on, high contrast on, big text on. 6 patients, debrief matched `buildDebrief`, 0 errors. The game has no sound yet, so "sound off" is the only state.
- **Greyscale shows three distinct tray shapes: pass.** `T12-greyscale-trays.png`.
- **Tutorial under 2 min 10 s when scripted: pass.** 27.6 s from the first patient to completion; about 45 s from entering XR.

What shipped:
- **Menu button** (table edge, right) opens a settings row: Contrast, Calm, Big text, Tutorial. Saved through `src/persist` settings and applied live. `T12-settings.png`, `T12-settings-on.png`.
- **High contrast:** black panels with thick white outlines, black floor, white tray outlines; shapes and labels unchanged. `T12-high-contrast-large.png`.
- **Calm:** passes `calm: true` to the runtime. Applies from the next shift (the runtime takes it at creation); a notice says so if toggled mid-shift.
- **Big text:** the speech and debrief panels grow 1.25x about their bottom edge. The vitals card does not grow: there is no room without breaking the 2 cm gaps, and its text is already above the minimum for its distance.
- **One hand:** no separate mode. Every action already works with either single hand, and tracking only needs one hand. The saved `oneHand` setting is not used.
- **Tutorial:** six beats with a ghost hand (poke the card, carry a token, poke Keep), one line at a time. The shift clock waits while the player learns. It plays on Module 1 until finished once; after that the Tutorial toggle turns it back on. `T12-beat1-place.png` to `T12-beat6-reveal.png`.
- **Tracking loss:** no hand seen for 0.8 s freezes the clock and input and shows "Show your hands to continue." Log: `tracking lost remaining=371.36s`, 12 s later `tracking resumed remaining=371.36s`. `T12-tracking-lost.png`.
- **Modules:** all three selectable from the start, "start here" on Module 1. `T12-modules.png`.
- **History and streak:** recorded through `src/game/localDate.ts` (the only `Date` use). The debrief shows the day streak and the number of shifts recorded.
- **Speech panel:** the lead advisor's quote and the latest second opinion's quote both stay on screen. `T12-two-quotes.png`.
- **Drift tag:** now flat on the table between the advisor's name and the trays, clear of the speech panel. `T12-drift-tag.png`.
- **No-leak check:** `T12-token-held-contrast.png` shows only "Make your own call first." while a token is held.

Not shipped in T12:
- **Gaze-dwell:** skipped. Spike S5 was never run, so the precondition is not met.
- **Sound-off setting:** added later with T10 (its own key, see "Sound (T10)").

## Stage B: T10 and T14 (11 Nov)
**T10 sound: built on 11 Nov, see "Sound (T10)" below.** (Earlier the same day this section said "not built"; the brief has since been written.)

**T14 acceptance:**
- Bundle under 15 MB: pass. `dist/` is 3.1 MB of files (largest 2.48 MB, about 0.68 MB gzipped).
- No console errors across 5 full shifts: pass. Module 1, 2, 3, 1, 2 in a row, hands only: 0 errors. One warning (debrief text shrunk to 93%) is fixed by a taller panel.
- `?debug=1` and `?safe=1` on the deployed build: both load with 0 failed requests and 0 console errors (`T14-live-debug-safe.png`, taken from the live URL; the overlay shows build tag, frame time and "Last error: none"). In the emulator both were exercised in a session: `T14-safe-debug-held.png`.
- "It looks clean" from a fresh person: **not done.** Needs a human; ask one person.

**T14 changes:**
- Flat-browser view: dark page background, wider camera, and the line "Open this page on the headset and enter XR to play." `T14-flat-view.png`.
- `?debug=1`: in-world panel left of the speech panel with frame rate, worst frame time, session and hand tracking state, last error and build tag.
- `?safe=1`: every material opaque; highlight rings switch on and off instead of fading; labels sit on black boxes.
- Token window ring is now one draw call per token (was 24) and still dashed in the last 8 s. Blob shadow under tokens.
- Commit snap overshoots slightly before the stamp.
- Canvas textures capped at 1024 px per side.
- Idle screens redraw four times a second instead of every frame.
- Test aids: `?speed=` and `src/game/testRun.ts` are read only in dev builds; the production bundle contains neither string (`grep -c TEST_RUN dist/assets/index-*.js` gives 0). `?seed=` still works on the live site, by design. The live URL with `?speed=8` loads normally and ignores it.

**T14 not done:**
- Ward overhang: unchanged. On the emulator's round desk the ward's front corners overhang. Fixing it means pushing the ward 10 cm further away, which breaks the 60 cm reach. A rectangular table fits.
- Instancing of tokens and trays: not done; object counts are small (at most 3 tokens, 3 trays).
- Frame rate on device: cannot be measured in the emulator. The debug overlay exists so the Quest tester can report it.
- Button labels ("Pause", "Keep", "Menu", "Centre") have capitals of about 1 cm, under the 1.2 cm rule.

## Stage C: coach wiring and T17 (11 Nov, emulator and mock proxy only)
**No real proxy and no real model were used.** The Worker is not deployed and no API key was read, printed or asked for. Every result below is against a local stand-in server on `127.0.0.1` that returns canned replies.

**Build wiring.** `.github/workflows/deploy.yml` passes the repository variable `VITE_COACH_PROXY_URL` into the build step. The variable is not set, so the live build has no coach button. When the owner sets it (Settings, Secrets and variables, Actions, Variables) the next push or a manual workflow run turns the button on. It is a public URL, not a secret.

**What shipped (only when the URL is set):**
- An "Ask the coach" button on the table edge, left, above Pause. It exists only on the debrief. The review panel gains the line "Ask the coach: Sends your shift summary numbers (no personal data) to an AI service." (`consentNotice` from `data/coach-prompt.json`). `T17-02-consent-notice.png`.
- A press builds the facts with `buildCoachFacts` and calls `askCoach`. The debrief panel shows a card: "Coach is thinking" with a turning ring on the button (`T17-08-thinking.png`), then either "Coach (AI)" with the text (`T17-06-success-coach-ai.png`) or "Coach" with "The coach is offline. Here is your summary." and the template headline and next step.
- One request per shift. A second press reopens the same card (`[coach] reopened (no new request)`). Back returns to the review; Map and the module buttons work while waiting.
- If the browser says it is offline, no request is attempted and the template shows at once.
- Files: `src/ui/coachUi.ts` (new), `src/game/systems/ShiftSystem.ts`, `src/game/components.ts`. Nothing in `src/core`, `src/coach` or `src/scene` changed.

**Tests (idle Module 2 shifts at 16x dev clock, seed `ward-a`, so the facts were always "not enough data"):**
| Case | Result | Evidence |
|---|---|---|
| URL unset | No button, no `[coach]` log line, debrief text as before, same score (-14) as with the URL set | `T17-01-coach-off-debrief.png` |
| Airplane mode (simulated in the page: `navigator.onLine` false and the proxy route cut) | Template with the offline line, 0 requests, 0 console errors | `T17-04-airplane-fallback.png` |
| Nothing listening at the URL | Template with the offline line | `T17-03-unreachable-fallback.png` |
| Mock kill switch (503) | Template with the offline line | `T17-05-killswitch-503-fallback.png` |
| Mock reply slower than 3 s | Template at 3.0 s (`asked` 07:55:40.053, `shown` 07:55:43.055) | `T17-09-timeout-fallback.png` |
| Mock reply with a number and "diagnosis" | Rejected (`reason=blocked: diagnos`), template shown | `T17-10-invalid-text-fallback.png` |
| Mock success | "Coach (AI)" card with the text; one POST of 177 bytes | `T17-06-success-coach-ai.png` |
| No request before the press | Mock request log empty from page load to the press in every run | |

Limits of these tests:
- In the three cases where a request is sent and fails (nothing listening, 503, timeout) the browser itself writes one or two network lines to the console at error level ("Failed to load resource", "net::ERR_ABORTED"). The game logs no error and shows no error screen, but the console is not empty. Page code cannot suppress those lines. Only the true-offline case is free of them.
- Real airplane mode could not be used: putting the managed browser offline makes the emulator relaunch it. The offline case is simulated inside the page.
- Presses were pinch-rays with one hand. Not run: a fingertip poke on this button, high contrast and big text with the coach card open, a played (non-idle) shift with the coach on, and anything on a headset.
- The real proxy's origin allowlist, rate limit and kill switch are Astra's unit tests (`tests/coachProxy.test.ts`); nothing here exercised a deployed Worker.

## Sound (T10, 11 Nov, emulator only, unheard)
**Nobody has heard these sounds.** The emulator's browser is headless. What is verified is that the cues are scheduled on a running audio context and produce a signal; loudness, tone and timing against the visuals need one listen by a person (a desktop browser is enough for tone, a headset for timing). If a listen before Fri 13 Nov evening finds them wrong or unstable, the fallback is to ship silent: set the Sound default to off or remove the five `cue()` calls, and say so here.

Brief: `proposals/audio-brief.md` (written by me in Argon's place; a proposal until the owner accepts it). Spike S6 passed, so it was implemented.

- **Five cues**, synthesised at run time with Web Audio oscillators (`src/audio/cues.ts`). No audio files, 0 bytes of audio payload, nothing external (CREDITS.md updated). Master gain 0.18; the longest cue is 0.36 s. Not spatialised.
- **Stamp** on an accepted commit (twin: token snap and tray ring pulse). **Advice** when the lead advisor's line first appears for a patient (twin: plinth lights, call and quote). **Verify** on a granted second opinion (twin: pip empties, "1 token spent" line). **Surge** when a surge patient arrives, never in calm mode (twin: "SURGE" on the card, shorter ring). **Result** when a patient resolves, a rising pair if the final call was right and a falling pair if wrong or missed (twin: truth tray glow, answer line, score).
- **Sound toggle** in the settings menu, on the left edge above Pause (the row of four is full). Saved under its own key `so.sound` through the safe storage wrapper, because `src/persist` settings has no mute field. On by default. `T10-01-settings-sound-on.png`, `T10-02-settings-sound-off.png`.
- It uses the framework listener's audio context, which is resumed on XR entry (S6). If the context is not running a cue is skipped; nothing waits for sound.
- Left out on purpose (see the brief): pickup and hover ticks, one motif per advisor, the last-8-seconds tick, the drift chime, ambient hum.

Tests:
| Run | Result |
|---|---|
| Full played Module 3 shift, sound on, seed `ward-a` (the footage script) | 14 stamp, 14 advice, 1 verify, 4 surge, 14 result cues, every one `played=true`; dev-build meter read a peak between 0.047 and 0.133 after each (below the 0.18 master gain, so no clipping). 0 console errors in the shift, `[debrief] match=true`, score 180, index 100 |
| Idle Module 3 shift, calm on, sound on (16x dev clock) | 0 surge cues, 14 result cues. 0 errors |
| Idle Module 3 shift, sound off (16x dev clock) | 18 cue events, all `played=false`. Same score (-18) as the same idle shift with sound on. 0 errors |

Not tested: sound on a headset or any speaker; the flat-browser view (no XR session, so the context may stay suspended and the game stay silent there); a mute while a cue is sounding (the cue finishes; the longest is 0.36 s).

Seen in passing, not changed: the idle calm shift ran to exactly the 8:00 hard cap (480.2 s) instead of ending when the last window closed. And with the settings row opened on the debrief, the settings help text is not visible (it is drawn on the speech panel, which the debrief hides); the toggles themselves work.

## Coach prompt evaluation (T16): written, not run
- `tools/coach-eval.mjs` compiles the proxy's own provider code (`server/coach-proxy/provider.ts`), sends the 30 fact sets in `tools/coach-golden-facts.json` one at a time with the proxy's 3 s limit, checks each reply with `validateCoachText`, and writes `submission/coach-eval/report.md`: pass rate, failure reasons, a 10-row spot-check table with an empty column for the owner, and every reply. It reads `COACH_API_KEY` and `COACH_MODEL` from the environment and never prints or records either. It exits non-zero under 95%.
- **The tool has not been run, not even its `--dry-run` mode**, as instructed. Checked separately: the provider compiles with the tool's compiler settings, and all 30 fact sets pass `validateCoachFacts` (6 balanced, 8 over-reliance, 6 under-reliance, 6 mixed, 4 not-enough). The report-writing code is therefore untested until the first real run.
- To run it: set the two variables in your own shell, then `node tools/coach-eval.mjs`. About 1 minute and 30 requests.

## Footage: the two missing moments (11 Nov)
- Seed hunt: `submission/footage/find-seed.mjs` builds Module 3 shifts with `core-spec` and lists seeds where Orator leads and is wrong and where the drifted advisor leads a drifted-category patient and is wrong. 119 of 326 seeds tried have both. Chosen: **`ward-128`**.
- In `ward-128`: patient 3, Orator leads, "very sure", says Amber, answer Red. Patient 9, Dash carries the "update installed" tag and says Amber on a breathing case, answer Red (Dash was right on breathing at patient 1).
- Re-shot in the emulator with `submission/footage/footage-ward-128.sh`: `14a`, `14b`, `15a`, `15b`, `15c` in `submission/footage/`. The run was played to patient 9 and stopped; 0 console errors to that point; the log matches the prediction patient by patient. README updated.
- Shots 01 to 13 are still from `ward-a`. For one consistent video, record everything on `?seed=ward-128`.

## Gap review (T11): shipped game against the M requirements in docs/01-PRD.md (11 Nov)
Scope: the game on `main`, judged from the code, the emulator runs recorded in this file, and the live URL load. "Emulator only" below means the requirement works in the IWSDK emulator and has never been run on a Quest.

**Not met, or met only in part:**
| ID | Requirement | Gap |
|---|---|---|
| FR-34 | Pause and resume from a wrist-attached menu | Pause works and stops the clock, but it is a table-edge button. No wrist menu (spike S3 never run). `docs/04` section 7 allows this; the PRD wording does not |
| FR-52 | Calm mode: slower clock, fewer simultaneous patients; changes `shift-config` multipliers | Arrivals and windows are 1.5x slower. Surges still bring two patients at once, so "fewer simultaneous patients" is not met. The 1.5 is a constant in `src/core/shift-runtime.ts` (same as `core-spec`), not a value in `data/shift-config.json`. Calm applies from the next shift, not mid-shift. Core lane |
| FR-51 | High-contrast toggle works at any time | Works before, during (menu open) and after a shift. The coach card and the Sound toggle have not been screenshotted in high contrast |
| FR-56 | Essential UI inside about 70 by 66 degrees and within 60 cm | Computed from the layout, not measured. With Big text the vertical span is about 67 degrees. The horizontal span is 68 degrees. No FoV mask review was done |
| FR-20 | Vitals card text at least 1.2 cm tall | Capitals on the card are about 1.19 cm (the rule scaled to the card's 46 cm distance asks for 1.10 cm). Under the literal 1.2 cm by a hair |
| FR-21 | Poke expands the card within 150 ms | The card opens on the frame after the finger lifts. The delay was not measured. There is no poke to collapse it (by design, Stage 1 fix 5) |
| FR-10 | Tutorial; a fresh player completes the first patient unaided | Tutorial built and scripted in 27.6 s. No fresh person has tried it |
| FR-61 | Fully playable with no network | True once the page has loaded: the base game makes no request, and the coach falls back. The page itself is not cached for offline use, so it cannot be opened without a network. No airplane-mode playthrough on a headset |
| FR-64 | Proxy: key server-side, rate limit, kill switch, spend cap | Code and tests are merged (kill switch, allowlist, rate limit). The Worker is not deployed, so the spend cap, the real kill switch and the origin allowlist are untested. No key-like string in the tracked files |

**Met in the emulator only (needs the Quest tester):**
FR-01 (the live URL loads with 0 failed requests and 0 console errors from a desktop browser; the 10 s cold start on a headset is unmeasured), FR-02 (passthrough session), FR-03 (plane detection and pinch confirm on a real table), FR-04 (virtual table after 5 s; the permission-declined path was not exercised), FR-05 (anchor and Centre; whether a native anchor is created is unknown, see `spikes/S4.md`), FR-22 and FR-25 (real pinch-grab and release), FR-24 (real poke on a plinth), FR-53 (one real hand).

**Met:**
FR-11, FR-23 (no advice before commit, three no-leak screenshots), FR-26, FR-27, FR-28, FR-30 (14 patients, 4/6/4, two surges, 480 s cap), FR-31, FR-32 (all 326 seeds checked have a drift), FR-33, FR-40 (`[debrief] match=true` in every run), FR-50, FR-62 (the only network call is in a press handler), FR-63 (validator tests, and a mocked bad reply was rejected in the emulator).

**FR-55 (every audio cue has a visual equivalent):** met in the emulator. Each of the five cues fires at the same event as an existing visual, and a shift with Sound off plays the same (see "Sound (T10)" above). Unheard.

**Non-functional and rule items that are still open:** NFR-01 frame rate on device (unmeasured), NFR-02 cold start on device (the bundle is 3.1 MB of 15), NFR-03 token instancing (not done; at most 3 tokens), NFR-07 same shift "on every device" (one machine only), RC-01 hands end to end on real hands, RC-07 video and form (owner), RC-10 if the coach is switched on its proxy must stay up until about 11 Dec.

**Should-level items not shipped** (for the submission text): FR-35 daily seed, FR-36 module gating (all three modules are open from the start), FR-42 personal best (history and streak are stored; a best score is not shown), FR-54 gaze-dwell.

## Stage D1: QA from docs/08 (11 Nov, emulator only)
Automated:
- `npm test`: 93 passed. `node tools/parity.mjs`: 0 diffs over 100 seeds. `npx tsc --noEmit`: clean. `npm run build`: OK, 3.1 MB.
- `core-spec`: 40 passed. `validate-cases.js`: "cases.seed.json is valid". `simulate-balance.js 300 0.7`: "BALANCE GATE: PASS".

Emulator checks table:
| Check | Result |
|---|---|
| Console clean in a full shift | Pass: five shifts in a row, 0 errors |
| No-leak at "token held" | Pass: `T07-token-held.png`, `T12-token-held-contrast.png`, `T14-safe-debug-held.png` |
| Commit loop | Pass |
| Verify cost | Pass: 1 token and 3 s each time |
| Window timeout | Pass: auto-Amber, penalty 3, logged missed |
| Pause and resume | Pass: clock unchanged after 23 s |
| Hard cap | Pass: 10 idle seeds end between 6:49 and 7:19 |
| Determinism | Pass by repetition: the same scripted Module 1 and Module 2 runs gave identical scores twice (-32, -25) |

Hands-only and accessibility checklist: hands only, one hand, sound off (silent build), greyscale, calm, tracking-loss freeze all pass. High contrast toggled mid-shift: toggling works while a shift is paused in the menu; I did not continue a full shift after a mid-shift toggle. Gaze-dwell: not shipped.

Fingertip pokes: a real touch with the index fingertip (no pinch) works on a module button, the vitals card and Keep. Earlier runs used pinch-rays for buttons.

Seated and field of view (computed from the layout, eye 40 cm above the table and 40 cm behind the ward centre; not measured on a headset):
- Reach: the farthest targets (advisor plinths) are about 55 cm in front of the head. Pass on paper.
- Vertical: from the footer (about 62 degrees below eye level) to the top of the speech panel (about eye level): about 61 degrees. Inside 66 degrees only if the player looks down about 30 degrees. With Big text the panel top rises and the span is about 67 degrees, slightly over.
- Horizontal: the ward's near corners are about 34 degrees either side: 68 degrees, just inside 70.
- Text size: panels meet the rule scaled for distance; button labels and the drift tag do not (about 1 cm capitals).

Cannot be checked here (remote Quest tester): frame rate, cold start time, real pinch and poke accuracy, real plane detection, 20 minutes without a crash, fresh-profile play on the headset.

## Stage D2: submission text against the shipped game
`python3 tools/check-submission.py`: taglines 114, 112, 118 characters OK; description 492 words OK; voice-over 177 words.

Mismatches in `docs/09-submission-kit.md` for the owner to fix (I did not edit it):
1. **"Every sound has a visual twin."** True since 11 Nov if the sound ships (five cues, each with a visual twin, Sound toggle). If the game ships silent after the listen, remove the sentence.
2. **Gaze-dwell** ("[IF SHIPPED] A gaze-dwell mode…", and "Gaze-dwell and one-hand modes replace pokes and grabs" in the hand-interactions text): not shipped. Remove both.
3. **"one-hand modes"**: there is no mode. Every action works with one hand by default. "One-hand play" in the description is accurate; the hand-interactions sentence is not.
4. **Daily seeded shift** ("[IF SHIPPED] A daily seeded shift…"): not shipped. The seed is fixed (`ward-a`, or `?seed=`). Remove it. A day streak is recorded and shown, which could be mentioned instead.
5. **AI coach** ("[IF SHIPPED] An optional AI coach…"): built, but off in the live build until the proxy is deployed and `VITE_COACH_PROXY_URL` is set. Keep the sentence only if that happens before the freeze and a real reply has been seen.
6. **"Immersive Web SDK 1.0"**: the installed version is 1.1.0-rc.2 (npm has no 1.0 tag).
7. **"A table-edge menu pauses the game."** Accurate, but it is a Pause button plus a Menu button for settings.
8. **Video shot 1:35 to 1:55, "advisor wrong on a category, player notices"**: not possible on seed `ward-a`. Solved by seed `ward-128` (patient 9, stills `15a` to `15c`).
9. **Video shot 0:55 to 1:15, "Orator gives a long confident wrong answer"**: not possible on seed `ward-a`. Solved by seed `ward-128` (patient 3, stills `14a` and `14b`).
10. **[CONFIRM AFTER BUILD] plane detection with virtual-table fallback**: true in the emulator. Real-room behaviour is untested.
11. Testing statement: everything is emulator only. Do not write "tested on Quest".

Accurate as written: four advisors and their descriptions, second-opinion tokens that cost clock time, unspent tokens score, the "update installed" badge, Calibration index with over and under rates, a finding, a next step and a trust map, shape-coded trays, high contrast, calm mode, pause and resume, about seven minutes for the full shift, offline play, fictional patients and the footer.

## Stage D3: footage kit (11 Nov)
`submission/footage/`: 16 stills from one scripted Module 3 run (score 179, index 100, 0 errors), a README mapping them to the storyboard, and the script to replay it for screen recording. Limits with seed `ward-a` are listed in that README.

## Stage D4: `rc1` not tagged, waiting for the owner
The condition is a fresh-profile test on the live URL that includes a full shift and the debrief. From here the live URL can only be loaded (0 failed requests, 0 console errors, start screen shows). Playing a shift on the deployed build needs a headset: the emulator is only part of the dev server, and a desktop browser has no WebXR. A full shift on the same code passes in the local emulator.

## Copy note for Astra (data lane): fixed
`data/debrief-lines.json` nextStep.balanced said "try the daily shift". Astra's `cd4c6fb` changed it to "Next: play another shift and try to beat your index." Still "daily shift" in `10-debrief-calibration.png` (shot before the fix).

## Stage 1 fixes and `rc1` (11 Nov, emulator only)
1. **Button labels:** Pause, Keep, Menu and Centre now have 2.6 cm label rows (capitals about 1.3 cm; the rule scaled to their 53 cm distance is 1.27 cm). Buttons were widened to fit; gaps stay at 2 cm or more. Toggled words were shortened to fit: Resume is now "Play", Close is "Done", Review is "Back". `S1-drift-tag-and-labels.png`.
2. **Drift tag:** now a standing three-row tag in front of the advisor: name, "update", "installed". Rows are 3 cm (capitals about 1.25 to 1.5 cm). It replaces that advisor's name label while shown, is not clipped by the trays, and stays clear of the speech panel and the neighbours' names. Muted colours as before. `S1-safe-drift-cue.png`.
3. **Full shift in `?safe=1`:** pass. Module 3, 14 patients, hands only, `[boot] debug=false safe=true`, console `{"info":89}`, 0 errors, `[debrief] match=true`. `S1-safe-advice.png`, `S1-safe-drift-cue.png`, `S1-safe-debrief.png`.
4. **Mid-shift high-contrast toggle:** pass. Module 1, contrast switched on while patient 2 was committed and waiting; that patient kept its call and resolved normally, the shift finished, 0 errors. `S1-contrast-toggled-mid-shift.png`.
5. **Card reach-through:** fixed by design instead of measured. A poke now only opens the vitals; nothing closes them by poke, so a hand passing over the card toward the lane cannot hide them. The tutorial closes them once at its start so it can teach the poke. An accidental open is harmless.
6. **`rc1`** tagged on the emulator bar: full local shifts in all three modules, live URL loads clean, four checks green. The debug overlay's build tag reads `rc1`.

## Stage 2: tester kit (11 Nov)
`submission/tester-kit/`: `README.md` (script: Module 1 then Module 3, think aloud, debug and safe links, how to record and screenshot), `feedback-form.md` (23 questions plus setup and build tag), `known-issues.md`, `hardware-unknowns.md`. No personal information. The recording, photo and hand-tracking steps were checked against Meta's help pages on 11 Nov 2026 (linked in the README) and reworded to match. Two items are marked "unverified, ask your own headset" because the pages do not cover them: microphone audio in recordings, and getting files off the headset. Meta's pages only describe starting a recording with a controller, so the script starts the recording before the controllers are put down. None of this was tried on a device. The README also asks for the build tag from `?debug=1`.

## Stages 3 and 4: waiting
- Coach: see Stage C above (built, off until the proxy URL is set).
- Sound: see "Sound (T10)" above (built, unheard).

## Open issues
- The ghost hand is a simple blocky shape and can be hard to read against the card.
- The live site cannot be played in a plain desktop browser (no WebXR there), so "fresh profile" checks on the live URL cover loading and console errors only. Full shifts are verified in the local emulator.
- For the remote Quest tester: poke accuracy on 4.5 cm buttons; accidental card pokes when reaching for the lane; speech text legibility at about 65 cm; whether the tracking-loss freeze triggers when hands rest in the lap.

## Worker deploy prep (13 Nov, branch `agent/coach-deploy-prep`, not merged)

**Worker prepared, not deployed; model gemini-3.5-flash-lite; key handling: .dev.vars (gitignored) -> wrangler secret.**

- `wrangler.jsonc` now carries the three public vars: `COACH_MODEL`, `COACH_ALLOWED_ORIGINS` (`https://vinay2214-cloud.github.io`), `COACH_ENABLED` (`true`). The key is not in any tracked file.
- `provider.ts`: one change. The request pins `generationConfig.thinkingConfig.thinkingLevel` to `MINIMAL` (field name and value checked against the Gemini API reference; thought tokens count against the 150-token cap). Still plain text only: no tools, no search grounding, no audio. Timeout, cap and fallback unchanged. No test covers the new field (`tests/` was outside this task's file list).
- `server/coach-proxy/deploy.sh` (owner runs it): refuses an empty key, deploys, pipes the key into `wrangler secret put`, prints the URL. `bash -n` passes; shellcheck is not installed here; the script has only been run with an empty key (it stopped, as intended).
- `.gitignore`: `.dev.vars`, `.env`, `.env.*`, `*.vars` ignored everywhere; `.dev.vars.example` is tracked.
- Checks: `wrangler deploy --dry-run` (4.161.0) bundles, 13.78 KiB, three vars bound; 133 tests pass; tsc clean; parity 0 diffs.
- **Not done, not claimed:** no deploy, no login, no secret upload, no call to Cloudflare or Gemini. The model name, the thinking field and the four curl tests in the README have never met the real services.

## Next
Waiting on the owner:
1. Listen to the five cues once (any desktop browser after entering the emulator, or the headset tester) and accept or reject `proposals/audio-brief.md`. Deadline for the silent fallback: Fri 13 Nov evening.
2. Deploy the Worker: fill `server/coach-proxy/.dev.vars`, `npx wrangler login`, `./deploy.sh`, then the four curl tests in `server/coach-proxy/README.md`. Then set the repository variable `VITE_COACH_PROXY_URL` to `https://second-opinion-coach.<your-subdomain>.workers.dev/coach` and re-run the deploy workflow. After that, one real coach tap on the live build.
3. Say when `COACH_API_KEY` and `COACH_MODEL` are set in the shell, so `tools/coach-eval.mjs` can be run; then spot-check 10 replies in `submission/coach-eval/report.md`.
4. Fix the submission text items in Stage D2 (not edited by me).
5. One fresh person for the tutorial and "it looks clean"; the Quest tester for everything marked emulator only.
