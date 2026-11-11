# 10 · Risks, decisions and open items

Keep this file alive. Add one entry per day under section 5.

## 1. Risk register

Likelihood and impact are my judgement (L / M / H). "Owner" is who acts.

| # | Risk | L | I | Mitigation | Trigger and fallback | Owner |
|---|---|---|---|---|---|---|
| R1 | **No Quest headset** (confirmed 9 Nov). The rules say a headset is not required and judges use Quest 3 or 3S | H | M | Emulator tools, a conservative performance budget, generous interaction tolerances, a `?debug=1` overlay, and **one or more remote testers with a Quest 3 or 3S** (they open your Pages link, play one shift, screen-record) on Sat 14 and Sun 15 Nov | No remote tester: emulator-only, say so honestly, prefer ray-grab and big targets | Vinay |
| R2 | Grab **release** signal is not exposed in IWSDK (S2) | M | H | Spike S2 on D0 with three fallbacks (remove-of-`Pressed`, custom ray drag, tap-to-place) | Wed noon unresolved: switch to tap-a-tray-while-holding. Keep the commit-first rule | Claude |
| R3 | 60 fps cannot be confirmed in the emulator | H | M | Keep budget in `03` section 8. Measure on device on D6 | No device: rely on conservative scene, state nothing about fps in the form | Claude |
| R4 | **Scope creep** with 9 days | H | H | Scope lock in `00`, gates, the cut list in `07` | Gate 1 or 2 fails: cut in the listed order, no debate | Vinay |
| R5 | Plane detection fails on the day or in the judge's room | M | M | 5 s timeout and the virtual table (FR-04) | Always reachable, no error screen | Claude |
| R6 | **Originality clash** with an existing title or game | L | M | Search Store and Devpost now. Fallback titles ready | Rename before the video, not after | Vinay |
| R7 | **Balance**: at high player accuracy, ignoring advisors nearly ties the calibrated policy | M | M | Balance gate in `tools/simulate-balance.js`. Raise the d3 share or lower Dash and Sage reliability | Gate fails after content freeze: fix `advisors.json`, re-validate, re-run | Astra |
| R8 | **Start membership not approved, or Developer Access not enabled, when you submit.** Required by the rules. Meta publishes no approval time | M | **H (blocks submission)** | Apply today (`13-start-membership-and-access.md`). Flair check at 24 h. Support ticket. Daily follow-up. Keep building meanwhile | Tue 17 Nov go or no-go. No alternative entry path in the rules I read | Vinay |
| R9 | **Polish gap**: jury scores polish 3 of 5 and the winner needs 4 | M | H | Art and audio are scheduled (D3, D6), not left for the end. Cohesive palette, simple low-poly | Cut features before cutting polish time | Claude and Vinay |
| R10 | **Blank page on GitHub Pages** (wrong `base` or Pages source) | M | H | Spike S7 on D0. Fresh-profile test on D8 | Fix `base`, set Pages source to Actions | Claude |
| R11 | Agent chaos: hallucinated APIs, merge conflicts, "fix-forward" loops | M | M | Lanes, worktrees, task cards, cross-review, spikes for unknown APIs | Revert to the last tag. Smaller tasks | Vinay |
| R12 | **Content guidelines** age band for a mild medical theme | L | M | Keep abstract, no gore, no real conditions as diagnoses. [VERIFY] Meta developer content guidelines | Reduce clinical wording if flagged. The theme is swappable to "mission control" with the same data | Vinay |
| R13 | IWSDK docs differ from the installed version | M | M | Read the installed `.d.ts` and the MCP reference. Do not copy my table blindly | Update `03` with what you find | Claude |
| R14 | Access or cost problems with Gemini 4 Argon or Codex, or the "Astra" name is wrong | M | L | Roles are swappable (`06`). Claude Code alone can do everything, slower | Collapse to Claude Code plus one reviewer | Vinay |
| R15 | The triage rubric is **game logic, not validated medicine** | H | M | Label it everywhere. Have a clinician friend spot-check 10 cases for plausibility. Never claim clinical accuracy | If a case looks clinically odd, edit the template, re-validate | Vinay |
| R16 | Rules details I could not fully verify (launch date field, repo visibility, video details) | M | M | The live form is the truth. Read it on D0 and D8 | Adjust `09` | Vinay |
| R17 | **Your bandwidth** (job, MSc) | M | H | Plan assumes 6 to 8 h a day. Agents do the typing, you do the decisions and tests | Fewer hours: cut earlier, do not stretch the end | Vinay |
| R19 | **AI coach** abuse, cost or downtime (kept by decision) | M | M | Safety design in `12-ai-coach-spec.md`: strict facts schema, validated output, key server-side, rate limit, spend cap, kill switch, template fallback | Anything fails: the game shows the template text and works as before. Coach UI wiring is cut first if Gate 2 is red | Astra and Vinay |
| R20 | **Real hand input is untested** (jitter, pinch thresholds, grab release) | H | M | Big targets, snap radius, ray-grab alternative, spike S2, remote Quest tester | If the pinch-grab is unreliable on the tester's device, switch the default to ray-grab or tap-a-tray | Claude |
| R18 | Evidence claims overreach | L | M | Say "lets you practise" not "reduces bias". Cite nothing you have not read | Edit the copy | Vinay |

## 2. Decisions log

| # | Date | Decision | Why | Revisit if |
|---|---|---|---|---|
| D1 | 9 Nov | Ideology: **calibrated oversight, trust is a skill** | Distinct, domain edge, evidence-aligned, hands-native, short sessions | A clash found in the originality search |
| D2 | 9 Nov | Game: **Second Opinion**, Gaming track, New Experience | Highest fit with the four jury criteria and several special awards | Gate 1 fails |
| D3 | 9 Nov | Version: "middle" (commit first, verify budget, drift, Orator) | Best idea-to-risk ratio for 9 days | Behind at Gate 2 (drop drift polish, keep core) |
| D4 | 9 Nov | **Pure runtime** in `src/core`, thin ECS adapters | Parallel agents, tested rules, no leaks | S2 or S3 force a different input model |
| D5 | 9 Nov | **No AI in the frame loop.** AI optional, game fully offline | Rule: not a wrapper. Robust launch | Never |
| D6 | 9 Nov | Triage truth is a **deterministic rubric**, not an LLM | Verifiable, reproducible, cannot hallucinate | Never |
| D7 | 9 Nov | **No voice input** | Reported unsupported in the Quest browser, adds risk | Never in this window |
| D8 | 9 Nov | Host on **GitHub Pages** | Free, static, stays live. Matches the IWSDK deploy guide | Pages cannot serve what we need |
| D9 | 9 Nov | Confidence peg is a **stretch**, decided Sat midday | Adds a gesture to the first-five-minutes path | Gate 2 red |
| D10 | 9 Nov | Drift: −0.35 on a strong advisor at patient 9 of 14, with a subtle cue | Teaches "re-check", not "distrust" | Playtests show the cue is invisible or too obvious |
| D12 | 9 Nov | **Keep the AI coach** as a SHOULD with a strict safety design | You asked to keep it. It is on the debrief only, optional, and falls back to templates | Gate 2 red: cut its UI wiring first |
| D13 | 9 Nov | Test emulator-first with **remote Quest testers** | No headset. Rules allow it | A headset becomes available |
| D14 | 9 Nov | **Solo entry** | Your answer. One entry per entrant | Never |
| D11 | 9 Nov | Table-edge menu first, wrist menu later | Wrist menu API unconfirmed | S3 shows a wrist menu is easy |

## 3. Corrections to earlier statements

- Earlier I said IWSDK lacked gaze input. The IWSDK 1.0 docs say gaze-and-pinch is supported and drives the same `Hovered` and `Pressed` tags. Gaze-dwell stays a SHOULD, pending spike S5.
- Earlier I considered voice via the Web Speech API. Dropped (D7).

## 4. Open items (answer these, in this order)

| # | Question | Needed by | Effect |
|---|---|---|---|
| Q1 | Do you have a Quest headset? **No (9 Nov).** Emulator plus remote testers | Today | R1 |
| Q2 | Solo or team? **Solo (9 Nov)** | Today | Form, credits |
| Q3 | Live AI coach, or fully offline? **Keep the coach (9 Nov)** | Done | `12-ai-coach-spec.md`. UI wiring is cut first if Gate 2 is red |
| Q4 | Target launch date to state on the form | Tue 17 Nov | Form field |
| Q5 | Start membership and Developer Access confirmed? **Not yet. Apply today.** | Approved by Wed 11 Nov | R8, `13-start-membership-and-access.md` |
| Q6 | Clinician friend for a 10-case plausibility check? | Fri 13 Nov | R15 |

## 5. Daily log (copy this block each day)

```
Date: __   Tag: __
Done: __
Broke or unknown: __
Decisions: __
Tomorrow: __
```

```
Date: Tue 10 Nov 2026   Tag: d0
Done: T01 scaffold (IWSDK 1.1.0-rc.2, AR template) merged into the kit folder. S1 PASS (dev server, command channel, screenshot, console). S2 PASS (Grabbed tag qualify/disqualify, 3 of 3 trials with emulated hands). core-spec 40 of 40.
Broke or unknown: S7 PARTIAL. Build loads from a /second-opinion/ subpath in a fresh profile locally, but the GitHub repo does not exist so the real Pages URL is untested. One day behind plan.
Decisions: kept Vite base './' (works at any subpath). Removed @meta-quest/metavr (needs a USB headset, collects usage data). npm "latest" is 1.1.0-rc.2, there is no 1.0 tag; versions pinned.
Tomorrow: finish S7 once the repo exists. T03 ward and placement, T04 token grab and tray snap. Astra can start T02 now.
```

```
Date: Tue 10 Nov 2026 (later), scene lane
Done: Phase 0 housekeeping, T06 (tag gate1), T05 merged, T07, T08, T12. Live site deploys from main. Status and evidence index: docs/STATUS.md.
Broke or unknown: external drive dropped once mid-run (no data lost). Dev server restarted itself once. Gaze-dwell skipped (S5 never run). No audio brief yet. Nothing tested on a Quest.
Decisions: all modules selectable; history via src/game/localDate.ts; no separate one-hand mode (every action already works one-handed); calm applies from the next shift; drift tag lies flat on the rail.
Tomorrow: Gate 2 check, T14, then T17 once Astra's T15 is merged.
```

```
Date: Wed 11 Nov 2026  Build tag: gate2+t14  Tester: Claude Code  Device: emulator
Passed: Gate 2 (tag gate2), T09 merged, T14, QA D1, submission check D2, footage kit D3. 93 tests, parity 0 diffs, five shifts in a row with 0 console errors.
Failed or not done: T10 sound (no brief), T17 coach (no T15), gaze-dwell (cut), rc1 (needs a shift on the live URL, which needs a headset).
New bugs (severity): none S0 or S1. S2: button labels and drift tag text under the size rule; ward corners overhang a round table.
Top 3 things the fresh player struggled with: not tested, no fresh player yet.
```

```
Date: Wed 11 Nov 2026 (later)  Build tag: rc1  Device: emulator
Done: Stage 1 fixes (labels, drift tag, safe-mode shift, mid-shift contrast, card open-only), tag rc1, tester kit. Waiting: T15 for the coach, audio brief for sound, tester feedback.
```
