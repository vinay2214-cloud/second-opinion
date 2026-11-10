# T01 · Scaffold the IWSDK project and run spikes S1, S2, S7

**Agent:** Claude Code · **When:** D0 Mon 9 Nov

**Goal:** A running IWSDK project with the kit inside it, the agent tooling working, a known way to detect token release, and a working GitHub Pages deploy.

## Inputs (read first)
- docs/03-technical-spec.md (sections 2, 3, 11, 12)
- docs/06-agent-playbook.md (section 3)
- ci/deploy.yml
- AGENTS.project.md

## Allowed files (edit only these)
- Everything in the project root except src/core/** and data/**
- spikes/S1.md, spikes/S2.md, spikes/S7.md

## Steps
1. Scaffold with npm create @iwsdk@latest. Name: second-opinion. Install. Copy the kit folders in. Append AGENTS.project.md to AGENTS.md.
2. Run npx iwsdk adapter sync --tools claude,codex, then npx iwsdk dev up --ai-mode agent --foreground, then npx iwsdk dev status. Take a screenshot with the MCP tool. Write spikes/S1.md with PASS or FAIL and evidence.
3. S2: create a scene with one grabbable cube and one tray box. Find out how to know when the cube is released and over the tray. Try, in order: documented callbacks (read docs via the MCP reference), removal of the Pressed tag, a custom pinch-ray drag. Write spikes/S2.md with the working method and a code snippet.
4. S7: set Vite base to '/<repo-name>/', copy ci/deploy.yml to .github/workflows/deploy.yml, push, and open the Pages URL in a fresh browser profile. Write spikes/S7.md.
5. Run (cd core-spec && npm test).

## Acceptance (must all pass)
- [ ] npx iwsdk dev status shows the browser command channel ready
- [ ] spikes/S1.md, S2.md, S7.md exist, each with a PASS or FAIL verdict and evidence
- [ ] Pages URL loads in a fresh profile with no 404s
- [ ] core-spec tests: 40 pass

## Do not
- Do not write game logic here
- Do not guess IWSDK API names

## Report format
One paragraph per spike: verdict, method, snippet path, surprises.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T01: Scaffold the IWSDK project and run spikes S1, S2, S7.
Goal: A running IWSDK project with the kit inside it, the agent tooling working, a known way to detect token release, and a working GitHub Pages deploy.
Inputs: docs/03-technical-spec.md (sections 2, 3, 11, 12); docs/06-agent-playbook.md (section 3); ci/deploy.yml; AGENTS.project.md.
Allowed files: Everything in the project root except src/core/** and data/**; spikes/S1.md, spikes/S2.md, spikes/S7.md.
Steps:
1. Scaffold with npm create @iwsdk@latest. Name: second-opinion. Install. Copy the kit folders in. Append AGENTS.project.md to AGENTS.md.
2. Run npx iwsdk adapter sync --tools claude,codex, then npx iwsdk dev up --ai-mode agent --foreground, then npx iwsdk dev status. Take a screenshot with the MCP tool. Write spikes/S1.md with PASS or FAIL and evidence.
3. S2: create a scene with one grabbable cube and one tray box. Find out how to know when the cube is released and over the tray. Try, in order: documented callbacks (read docs via the MCP reference), removal of the Pressed tag, a custom pinch-ray drag. Write spikes/S2.md with the working method and a code snippet.
4. S7: set Vite base to '/<repo-name>/', copy ci/deploy.yml to .github/workflows/deploy.yml, push, and open the Pages URL in a fresh browser profile. Write spikes/S7.md.
5. Run (cd core-spec && npm test).
Acceptance: npx iwsdk dev status shows the browser command channel ready | spikes/S1.md, S2.md, S7.md exist, each with a PASS or FAIL verdict and evidence | Pages URL loads in a fresh profile with no 404s | core-spec tests: 40 pass
Do not: Do not write game logic here | Do not guess IWSDK API names
Report: One paragraph per spike: verdict, method, snippet path, surprises.
```
