# 06 · Agent playbook (Claude Code, GPT-6 Astra, Gemini 4 Argon)

**Naming note.** You wrote "astra" and "gemini 4 argon". I am reading these as **GPT-6 Astra** (used through Codex) and **Gemini 4 Argon**. If "Astra" is something else, only the roles table changes, nothing else in the kit depends on it. Gemini 4 Argon is available through the paid API, so use it through the API or an IDE that supports it, not through the Gemini CLI.

## 1. Principle

You are the **product owner and final gate**. The agents are a small team with strict lanes. The tested `core-spec/` is the contract: if an agent's code passes the golden tests, the rules are right. Anything about the headset that is not in the docs is a **spike**, never a guess.

## 2. Roles

| Agent | Best used for | Owns (only edits here) | Never does |
|---|---|---|---|
| **Claude Code** (primary builder, integrator) | IWSDK scene and ECS adapters, wiring the runtime, using the IWSDK MCP (screenshots, console, ECS inspect, input simulation) to verify its own work, merging | `src/index.ts`, `src/game/**`, `src/scene/**`, `src/ui/**`, `src/access/**`, `src/audio/**`, `vite.config.ts`, `iwsdk.config.json` | Change `src/core/**` rules or `data/**` without a failing test that justifies it |
| **GPT-6 Astra** (Codex) | Parallel, well-specified modules: port `core-spec` JS to TypeScript, persistence wrapper, Vitest suite, scripts, the AI coach client and serverless proxy (T15), independent code review of Claude's PRs | `src/core/**`, `src/persist/**`, `src/coach/**`, `server/**`, `tests/**`, `core-spec/**` | Touch `src/scene/**` or `src/ui/**`, invent IWSDK APIs |
| **Gemini 4 Argon** | Long-context work and writing: content proposals, doc-vs-PRD gap review, submission copy, storyboard, README, video script, coach prompt evaluation (T16) | `proposals/**`, `docs/**` (except 03), `submission/**` | Edit `src/**`. Everything it writes is a **proposal** until a validator or you accept it |
| **You** | Decisions, playtests, device testing, form and video, all final merges to `main` | Everything, by accepting PRs | Skip the Gate checks |

## 3. Setup (once, today)

```bash
# 1. Scaffold the IWSDK project
npm create @iwsdk@latest            # name it second-opinion, follow prompts
cd second-opinion && npm install

# 2. Drop the kit in
cp -r ../second-opinion-kit/{docs,tasks,data,schemas,core-spec,ci} .
cat ../second-opinion-kit/AGENTS.project.md >> AGENTS.md   # CLAUDE.md is a shim that imports AGENTS.md

# 3. Wire agent tooling (writes .mcp.json and Codex config)
npx iwsdk adapter sync --tools claude,codex
npx iwsdk mcp inspect                                       # confirm the tools list

# 4. Prove the core
(cd core-spec && npm test && node tools/validate-cases.js)  # 40 tests pass, cases valid

# 5. Start the dev server for agents
npx iwsdk dev up --ai-mode agent --foreground               # headless, managed browser
npx iwsdk dev status                                        # wait for commandReady
```

For Gemini 4 Argon, run `npx iwsdk adapter prompt` and paste the output into its system or project instructions (the IWSDK adapters list Claude and Codex, not Gemini). Give it the whole `docs/` folder plus `data/` as context. Keep it away from `src/`.

## 4. Task card format (every card in `tasks/`)

```
Goal · Inputs (files to read first) · Allowed files (edit only these) ·
Steps · Acceptance (commands that must pass) · Do-not list · Report format
```

Every prompt begins with: **"Read `AGENTS.md`, then the files listed under Inputs. Do not edit anything outside Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write `spikes/<id>.md`; do not guess."**

## 5. Parallel lanes (git worktrees)

```bash
git init && git add -A && git commit -m "kit + scaffold"
git worktree add ../so-core   -b agent/core     # Astra
git worktree add ../so-scene  -b agent/scene    # Claude Code (scene)
git worktree add ../so-content -b agent/content # Argon (proposals only)
```

- One agent, one worktree, one branch, one lane (section 2).
- Merge to `main` only through you (or Claude Code as integrator) after: `npm test`, `node core-spec/tools/validate-cases.js`, a screenshot via MCP for UI changes.
- `main` must always build and deploy. Tag good states: `git tag gate1`, `gate2`, `submission-1`.
- Commit small and often. If an agent breaks something, `git revert`, do not let it "fix forward" for an hour.

## 6. Review protocol (cross-model, cheap, effective)

| Change | Reviewer | Check |
|---|---|---|
| Claude Code scene and adapters | Astra (fresh context) | Against `AGENTS.md` rules and the lists below |
| Astra's core port | Claude Code | Golden tests identical, no `Date`, no three or IWSDK imports |
| Argon's content proposals | `validate-cases.js` and the balance gate, then you | Validators first, humans second |
| Docs vs PRD | Argon (long context) | Gap list: any FR without a task, any task without an FR |

**Review checklist for code:**

1. UI reads only `publicView()`. No advice or truth before the right moment.
2. No `Date` or `Math.random` in `src/core`. Time is passed in. Randomness comes from `rng.js`.
3. No allocation, JSON parse, or network call in a per-frame `update`.
4. Every `localStorage` access is try/catch with an in-memory fallback.
5. No hard-coded tuning numbers. They come from `data/`.
6. Every sound has a visual twin.
7. No console errors in a full shift (use the MCP console tool).

## 7. Daily rhythm

| Time | What |
|---|---|
| Morning (30 min) | Read yesterday's report. Pick today's task cards. Launch agents in their worktrees |
| Midday (20 min) | Check progress, merge the green branches, run the checks |
| Afternoon | Playtest the build yourself. Write what felt bad into `docs/10-risks-and-decisions.md` |
| Evening (30 min) | Fix list for tomorrow. Tag the day's good state. Push |

## 8. What to ask each agent first (kickoff prompts)

The paste-ready versions are in `tasks/`. Short form:

| Agent | First task |
|---|---|
| Claude Code | `T01` scaffold, spikes S1 and S2 and S7 |
| Astra | `T02` port core to TypeScript with the same 33 golden tests (the 7 coach tests follow in T15) |
| Argon | `T11` read all docs, return a gap list and a 3-sentence critique of the idea |

## 9. Hard rules for all agents

1. The runtime is the only source of game truth.
2. Never ship an unverified IWSDK API call. Find it in the docs or the `.d.ts`, or run a spike.
3. Never put real patient data, real names or brands anywhere.
4. Never make a medical claim in code, text or the form.
5. Do not add features that are not in the PRD without asking you.
6. After the feature freeze (Mon 16 Nov EOD) only bug fixes.

## 10. What not to delegate

- Deciding the scope cut when a gate fails.
- The first-five-minutes playtest with a fresh person.
- The on-device test and the fresh-profile test.
- Watching your own video before you upload it.
- Filling and submitting the form. Read every field twice.
