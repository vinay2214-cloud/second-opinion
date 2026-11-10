# T08 · Module 3: surges, drift, Orator, module flow

**Agent:** Claude Code · **When:** D4 Fri 13 Nov

**Goal:** Full 14-patient shift with two surges, mid-shift drift and the cue, all four advisors, and Module 1 to 3 progression.

## Inputs (read first)
- docs/02-game-design.md (sections 7 to 9)
- data/shift-config.json
- data/advisors.json

## Allowed files (edit only these)
- src/game/**
- src/ui/**
- src/scene/**
- src/audio/**

## Steps
1. Use the 'pressure' module lineup and shift config. Show both arrivals of a surge 4 s apart with shorter rings.
2. Show the drift cue (driftCue()) as a small 'update installed' badge on the affected advisor. Easy to miss, no modal.
3. Orator needs a clearly longer speech card, calm voice motif and 'very sure' styling. Keep it fun, not mocking.
4. Module selection: complete a module to unlock the next. Store progress with src/persist.

## Acceptance (must all pass)
- [ ] A full module-3 shift runs to the debrief
- [ ] Drift cue appears at patient 9 (atIndex 8)
- [ ] Shift ends by 8:00 in 10 consecutive scripted runs with different seeds

## Do not
- Do not change drift numbers
- No new advisors beyond Dash, Sage, Ledger, Orator

## Report format
Screenshot of the drift cue and a surge, and the 10-run summary.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T08: Module 3: surges, drift, Orator, module flow.
Goal: Full 14-patient shift with two surges, mid-shift drift and the cue, all four advisors, and Module 1 to 3 progression.
Inputs: docs/02-game-design.md (sections 7 to 9); data/shift-config.json; data/advisors.json.
Allowed files: src/game/**; src/ui/**; src/scene/**; src/audio/**.
Steps:
1. Use the 'pressure' module lineup and shift config. Show both arrivals of a surge 4 s apart with shorter rings.
2. Show the drift cue (driftCue()) as a small 'update installed' badge on the affected advisor. Easy to miss, no modal.
3. Orator needs a clearly longer speech card, calm voice motif and 'very sure' styling. Keep it fun, not mocking.
4. Module selection: complete a module to unlock the next. Store progress with src/persist.
Acceptance: A full module-3 shift runs to the debrief | Drift cue appears at patient 9 (atIndex 8) | Shift ends by 8:00 in 10 consecutive scripted runs with different seeds
Do not: Do not change drift numbers | No new advisors beyond Dash, Sage, Ledger, Orator
Report: Screenshot of the drift cue and a surge, and the 10-run summary.
```
