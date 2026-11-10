# 11 · Step-by-step blueprint (do these in order)

This is the one path from today to a submitted entry. Each step says **what you do**, **what the agents do**, and **the check that lets you move on**. Dates assume today is **Mon 9 Nov 2026** and the deadline is **Wed 18 Nov 12:00 PM PT (Thu 19 Nov 01:30 AM IST)**. Submit by **18:00 IST on 18 Nov**.

| Step | When | Goal | Gate |
|---|---|---|---|
| 0 | Mon 9 Nov, 60 min | **Apply for Start**, developer account and organization, Devpost, repo | Applications submitted, repo exists |
| 1 | Mon 9 Nov, 10 min | Prove the kit works | 40 tests pass |
| 2 | Mon 9 Nov, 45 min | Scaffold the IWSDK project | Dev server and MCP tools ready |
| 3 | Mon 9 Nov, 15 min | Start three agents in parallel | Three worktrees running |
| 4 | Mon 9 Nov evening | Spikes S1, S2, S7 | Deploy works from a fresh profile |
| 5 | Tue 10 Nov | Ward and tokens | Ward on the table, token snaps to a tray |
| 6 | Wed 11 Nov | **Commit loop playable** | **Gate 1** |
| 7 | Thu 12 Nov | Verify tokens, HUD, debrief | Debrief shows the index |
| 8 | Fri 13 Nov | Module 3 (surges, drift, Orator) | Full shift start to debrief |
| 9 | Sat 14 Nov | Accessibility, onboarding, first-five-minutes test | **Gate 2** + content freeze |
| 10 | Sun 15 Nov | Art, sound, performance, coach button, remote Quest retest, footage | Smooth and clean |
| 11 | Mon 16 Nov | Bug fixes only, edit the video, QA plan | **Feature freeze (EOD)** |
| 12 | Tue 17 Nov | Fresh-profile test, upload video, draft the form | Fresh profile plays a full shift |
| 13 | Wed 18 Nov | Submit by 18:00 IST | Confirmation screenshot |

## Step 0 · Apply for Start and unblock (60 min, you)

1. **Do this first, it blocks submission.** Follow `docs/13-start-membership-and-access.md` steps A to D: developer account, developer organization, apply to Start, register on Devpost. Save screenshots. Check the Developer Forum flair in 24 hours (task **T00**).
2. Open the live submission form. Read every field. Note differences from `docs/09-submission-kit.md`.
3. Search the Meta Horizon Store and Devpost for "Second Opinion" and similar mechanics. Pick a fallback title if needed.
4. Your answers are recorded: **no headset** (emulator plus remote Quest testers), **solo entry**, **AI coach kept** (`docs/12-ai-coach-spec.md`). Start approval is the open item (Q5).
5. Create an empty public GitHub repo `second-opinion`. Settings, Pages, Source: **GitHub Actions**.

## Step 1 · Prove the kit (10 min, you)

```bash
cd second-opinion-kit/core-spec
npm test                           # 40 pass
node tools/validate-cases.js       # valid
node tools/simulate-balance.js 300 0.7   # BALANCE GATE: PASS
```

## Step 2 · Scaffold (45 min, Claude Code, task T01)

```bash
npm create @iwsdk@latest           # name: second-opinion
cd second-opinion && npm install
cp -r ../second-opinion-kit/{docs,tasks,data,schemas,core-spec,ci,tools,spikes,proposals,submission} .
cp ../second-opinion-kit/CREDITS.md .
cat ../second-opinion-kit/AGENTS.project.md >> AGENTS.md
npx iwsdk adapter sync --tools claude,codex
npx iwsdk dev up --ai-mode agent --foreground     # keep running; check with: npx iwsdk dev status
git init && git add -A && git commit -m "kit + scaffold" && git tag d0
```

## Step 3 · Start three agents (15 min, you)

```bash
git worktree add ../so-core    -b agent/core      # GPT-6 Astra
git worktree add ../so-scene   -b agent/scene     # Claude Code
git worktree add ../so-content -b agent/content   # Gemini 4 Argon (proposals only)
```

Paste the prompts from `tasks/T01-scaffold-and-spikes.md` (Claude Code), `tasks/T02-port-core-to-ts.md` (Astra) and `tasks/T11-gap-review.md` (Argon). Rules: one agent, one lane, one card at a time.

## Step 4 · Day-0 spikes (evening, Claude Code)

Spikes **S1** (tooling works), **S2** (how to detect token release) and **S7** (GitHub Pages deploy from a fresh profile). Read `spikes/*.md`. **Decide now:** if S2 found no usable release signal, choose the tap-a-tray fallback and update `docs/04` section 1. Tag `d0`.

## Step 5 · Ward and tokens (Tue 10 Nov)

Tasks **T03** (ward, plane or virtual table, S4), **T04** (token grab and tray snap), **T05** (persistence, Astra). Spikes **S3, S5, S6, S8** in the gaps. You: play the emulator for 15 minutes, write down what feels bad. Check: the ward appears within 5 s, a token snaps to a tray, 33 tests still pass after the port (parity script prints 0 diffs).

## Step 6 · Commit loop playable (Wed 11 Nov) → Gate 1

Task **T06**. Module 1 end to end: token arrives, you read the card, commit by releasing on a tray, advice appears **after** the commit, keep or change, truth is revealed. **Gate 1 (EOD):** hands-only loop works in the emulator. **If it fails:** stop all features, fix the loop, ship Modules 1 and 2 only. Tag `gate1`.

## Step 7 · Verify, HUD, debrief (Thu 12 Nov)

Task **T07** (verify tokens, 3 s clock cost, HUD, debrief), **T10** brief from Argon. Check: each verify spends one token and 3 s, debrief equals `buildDebrief` output.

## Step 8 · Module 3 (Fri 13 Nov)

Tasks **T08** (surges, drift cue, Orator, module flow) and **T09** (trust map, property tests, balance gate at 0.6, 0.7, 0.8). In parallel, Astra builds the coach client and proxy (**T15**) and Argon writes the coach prompt tests (**T16**). Ask a clinician friend to spot-check 10 cases (R15). Check: a full 14-patient shift runs to the debrief and ends by 8:00.

## Step 9 · Accessibility, onboarding, first-five-minutes → Gate 2 (Sat 14 Nov)

Task **T12**. **Midday:** decide whether the confidence peg is allowed (only if Gate 2 is green). Run the **first-five-minutes test** with a fresh person (`docs/08` section 3.1). **Gate 2 (EOD):** full start-to-debrief experience works. **Content freeze.** Deploy the coach proxy, set the provider spend cap, test the kill switch. First remote Quest test (`docs/08` 3.4). **If Gate 2 fails:** cut the coach button, gaze-dwell, Echo, trust map polish, in that order. Tag `gate2`.

## Step 10 · Polish, performance, coach button, remote test (Sun 15 Nov)

Task **T14** plus the audio from **T10**, and **T17** (the "Ask the coach" button) if Gate 2 was green. Run the remote Quest retest (`docs/08` 3.4). Record footage from the emulator (the rules allow it) and say so in the video description. No new features and no new art direction after today.

## Step 11 · Freeze, video, QA (Mon 16 Nov)

Bug fixes only (S0 and S1). Edit the video from `docs/09` section 5. Run the full QA plan. **Feature freeze at EOD.** Task **T13** drafts from Argon, resolved against what really shipped (`python3 tools/check-submission.py` must pass).

## Step 12 · Fresh-profile test and draft the form (Tue 17 Nov)

Open the public Pages URL in a **new browser profile**. Play a full shift. No 404s, no console errors. This is a **blocker**: if it fails, nothing else matters. Upload the video as **public** and test it logged out. Fill the form as a draft. Tag `rc1`.

## Step 13 · Submit (Wed 18 Nov)

1. Tag `submission-1`. After this, **no deploys**.
2. Final read of every field. Screenshot every field.
3. Submit by **18:00 IST** (04:30 AM PT). Screenshot the confirmation.
4. Open the build link and the video link logged out one last time.
5. Do not touch the repo or the deployed build until judging is over.

## The daily rhythm (4 lines)

Morning: read yesterday's log, pick today's cards, launch agents. Midday: merge green branches, run checks. Afternoon: **play the build yourself**. Evening: tag the good state, write the daily log (`docs/10` section 5).

## When something fails

| Symptom | Do this |
|---|---|
| An agent invents an IWSDK API | Stop. Write a spike. Use the docs, the `.d.ts` or the MCP reference |
| Agent loops for more than 30 min | Revert to the last tag, split the task smaller |
| Two agents conflict | Lanes were crossed. Revert the later one, re-run it inside its lane |
| A gate fails | Apply the cut list in `docs/07` section 4. No debate |
| Deploy shows a blank page | Check Vite `base`, Pages source = GitHub Actions, rebuild |
| No headset | Emulator-only, say so in the form, spend the time on the video and the first-five-minutes test |
| You are behind by a day | Cut earlier. Do not push the freeze or the submission |

## The ten things only you can do

1. Decide scope cuts when a gate fails.
2. Check accounts and read the live form.
3. Run the first-five-minutes test with a stranger.
4. Arrange a remote Quest tester (or state honestly that you could not).
5. Have a clinician spot-check the cases.
6. Choose the target launch date and team details.
7. Watch your own video, logged out.
8. Run the fresh-profile test.
9. Read every form field twice.
10. Press submit, with 7 hours to spare.
