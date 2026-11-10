# Second Opinion — project kit

**Idea:** *Trust is a skill. Practise it.* A seated, hands-only mixed reality tabletop game for the **Meta VR Start Developer Competition 2026** (Gaming track, New Experience division). You triage fictional patients, **commit your own call first**, then hear AI advisors whose reliability is hidden, spend limited second-opinion tokens, survive a mid-shift "update installed" drift, and finish with an honest **calibration debrief**.

**Deadline:** Wed 18 Nov 2026 12:00 PM PT = Thu 19 Nov 01:30 AM IST. Plan to submit by 18:00 IST on 18 Nov.

## What is in this kit

| Path | What |
|---|---|
| `docs/00-decision-and-ideology.md` | The final decision, four-lens evaluation, scope lock, kill criteria |
| `docs/01-PRD.md` | Product requirements (FR, NFR, rule compliance, release criteria) |
| `docs/02-game-design.md` | Game design (loop, scoring, advisors, drift, modules, debrief) |
| `docs/03-technical-spec.md` | Architecture, verified IWSDK facts, Day-0 spikes, deploy |
| `docs/04-interaction-and-accessibility-spec.md` | Hands, gaze, feedback, accessibility modes, onboarding |
| `docs/05-content-spec.md` | Case pool, advisors, strings, debrief copy |
| `docs/06-agent-playbook.md` | How to run Claude Code, GPT-6 Astra and Gemini 4 Argon together |
| `docs/07-build-plan.md` | Day-by-day plan to submission, gates, cut list |
| `docs/08-qa-test-plan.md` | Automated, emulator and human tests |
| `docs/09-submission-kit.md` | Form drafts, video storyboard, voice-over, checklists |
| `docs/10-risks-and-decisions.md` | Risk register, decisions, open items |
| `docs/11-step-by-step-blueprint.md` | **The one path from today to submission**, step by step |
| `docs/12-ai-coach-spec.md` | The optional AI Calibration Coach: safety design, proxy, tests, schedule |
| `docs/13-start-membership-and-access.md` | **Start membership and Developer Access: do this today** |
| `tasks/` | 18 task cards (T00 to T17), most with paste-ready prompts |
| `core-spec/` | **Tested executable game core** (40 tests). Port to TypeScript and keep as golden tests |
| `data/`, `schemas/` | Tuning data, 60 validated cases, JSON Schema |
| `ci/deploy.yml` | GitHub Pages workflow |
| `tools/check-submission.py` | Tagline and description limit checker |
| `AGENTS.project.md` | Rules to append to the IWSDK-generated `AGENTS.md` |

## Start in 15 minutes

```bash
# 0. Prove the kit works (needs Node 20+)
cd core-spec && npm test && node tools/validate-cases.js && node tools/simulate-balance.js 300 0.7 && cd ..

# 1. Scaffold the IWSDK project (outside this folder), then copy the kit in
npm create @iwsdk@latest            # name: second-opinion
cd second-opinion && npm install
cp -r /path/to/second-opinion-kit/{docs,tasks,data,schemas,core-spec,ci,tools} .
cat /path/to/second-opinion-kit/AGENTS.project.md >> AGENTS.md

# 2. Wire the agents and start the dev server
npx iwsdk adapter sync --tools claude,codex
npx iwsdk dev up --ai-mode agent --foreground      # in a second terminal: npx iwsdk dev status

# 3. Hand out the first three cards (each in its own git worktree)
#    Claude Code -> tasks/T01-scaffold-and-spikes.md
#    GPT-6 Astra -> tasks/T02-port-core-to-ts.md
#    Gemini 4 Argon -> tasks/T11-gap-review.md
```

Then follow `docs/11-step-by-step-blueprint.md` (and `docs/07-build-plan.md` for the detail). Do the gates. Do not skip the first-five-minutes test.

## Honest limits

- You have no headset: that is allowed by the rules, so the plan is emulator-first plus remote Quest testers (`docs/08` section 3.4).
- I could not run IWSDK or a headset here. Anything about IWSDK that the docs do not state is listed as a **spike** (`docs/03`, section 3). Verify against the installed version.
- The triage rubric is **game logic, not clinical guidance**. Have a clinician spot-check a few cases, and never claim medical accuracy.
- Nobody can promise a win. Last year had 650+ entries and this year has 20 prizes. This plan maximises the quality and the odds, it does not guarantee them.
