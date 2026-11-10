# T07 · Verify tokens, clock cost, HUD and debrief v1

**Agent:** Claude Code · **When:** D3 Thu 12 Nov

**Goal:** Module 2: second opinions cost a token and 3 s, the HUD shows clock, tokens and score, and the debrief shows the Calibration index.

## Inputs (read first)
- docs/02-game-design.md (sections 4 to 8, 10)
- src/core (verify, availableVerifiers, summary)
- data/debrief-lines.json

## Allowed files (edit only these)
- src/game/**
- src/ui/**
- src/scene/**

## Steps
1. Make advisor plinths pokeable. Call verify(i, advisorId). Disable when availableVerifiers is empty or tokens are 0, with the 'No second opinions left.' string.
2. HUD: shift clock (remainingSec), token pips, running score. Keep it inside the central field of view and the 60 cm reach.
3. Debrief panel from summary().debrief: headline, index (or 'Not enough data yet'), over and under rates, up to 3 findings, one next step.
4. Pause: stop calling tick while paused. Shift the clock reference so the clock does not jump on resume.

## Acceptance (must all pass)
- [ ] Each verify spends exactly one token and adds 3 s
- [ ] Debrief text equals buildDebrief output for the same log (unit test or logged diff)
- [ ] Pause for 20 s does not change the clock

## Do not
- Do not hide the clock cost
- Do not show any reliability number

## Report format
Screenshots and the pause test log.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T07: Verify tokens, clock cost, HUD and debrief v1.
Goal: Module 2: second opinions cost a token and 3 s, the HUD shows clock, tokens and score, and the debrief shows the Calibration index.
Inputs: docs/02-game-design.md (sections 4 to 8, 10); src/core (verify, availableVerifiers, summary); data/debrief-lines.json.
Allowed files: src/game/**; src/ui/**; src/scene/**.
Steps:
1. Make advisor plinths pokeable. Call verify(i, advisorId). Disable when availableVerifiers is empty or tokens are 0, with the 'No second opinions left.' string.
2. HUD: shift clock (remainingSec), token pips, running score. Keep it inside the central field of view and the 60 cm reach.
3. Debrief panel from summary().debrief: headline, index (or 'Not enough data yet'), over and under rates, up to 3 findings, one next step.
4. Pause: stop calling tick while paused. Shift the clock reference so the clock does not jump on resume.
Acceptance: Each verify spends exactly one token and adds 3 s | Debrief text equals buildDebrief output for the same log (unit test or logged diff) | Pause for 20 s does not change the clock
Do not: Do not hide the clock cost | Do not show any reliability number
Report: Screenshots and the pause test log.
```
