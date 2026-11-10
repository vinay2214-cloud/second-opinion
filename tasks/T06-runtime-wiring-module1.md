# T06 · Wire the runtime: vitals card, advice reveal, resolve (Module 1 end to end)

**Agent:** Claude Code · **When:** D2 Wed 11 Nov

**Goal:** Gate 1: a hands-only commit loop that plays Module 1 (Dash only, 6 patients) from start to a basic debrief.

## Inputs (read first)
- docs/02-game-design.md
- docs/03-technical-spec.md (sections 5, 6, 7)
- src/core (createShiftRuntime, publicView)
- docs/05-content-spec.md (section 4)

## Allowed files (edit only these)
- src/game/**
- src/ui/**
- src/scene/**
- src/index.ts

## Steps
1. Build the shift from a seed with buildShift for Module 1. Create the runtime and call tick(performance.now()) every frame.
2. Render the vitals card from publicView() only. Poke to expand. Text at least 1.2 cm tall at 50 cm.
3. On release over a tray call commit(). After a 0.6 s hold show the lead advisor line from the return value or publicView().
4. Add a Keep button and the change-tray path calling finalize(). Show the truth tray glow, whyLine and a score toast from the 'resolved' event.
5. Handle arrive, resolved and shiftEnd events. On shiftEnd show a plain debrief panel from summary().

## Acceptance (must all pass)
- [ ] Scripted MCP run completes 6 patients hands-only
- [ ] Screenshot at the 'token held' state shows no advice text
- [ ] Window timeout produces auto-Amber and -3
- [ ] 0 console errors in a full Module 1 shift

## Do not
- UI must not read anything except publicView() and runtime return values
- No scoring in adapters
- No Date or Math.random

## Report format
Screenshots (token held, advice, resolve, debrief) and the console log summary.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T06: Wire the runtime: vitals card, advice reveal, resolve (Module 1 end to end).
Goal: Gate 1: a hands-only commit loop that plays Module 1 (Dash only, 6 patients) from start to a basic debrief.
Inputs: docs/02-game-design.md; docs/03-technical-spec.md (sections 5, 6, 7); src/core (createShiftRuntime, publicView); docs/05-content-spec.md (section 4).
Allowed files: src/game/**; src/ui/**; src/scene/**; src/index.ts.
Steps:
1. Build the shift from a seed with buildShift for Module 1. Create the runtime and call tick(performance.now()) every frame.
2. Render the vitals card from publicView() only. Poke to expand. Text at least 1.2 cm tall at 50 cm.
3. On release over a tray call commit(). After a 0.6 s hold show the lead advisor line from the return value or publicView().
4. Add a Keep button and the change-tray path calling finalize(). Show the truth tray glow, whyLine and a score toast from the 'resolved' event.
5. Handle arrive, resolved and shiftEnd events. On shiftEnd show a plain debrief panel from summary().
Acceptance: Scripted MCP run completes 6 patients hands-only | Screenshot at the 'token held' state shows no advice text | Window timeout produces auto-Amber and -3 | 0 console errors in a full Module 1 shift
Do not: UI must not read anything except publicView() and runtime return values | No scoring in adapters | No Date or Math.random
Report: Screenshots (token held, advice, resolve, debrief) and the console log summary.
```
