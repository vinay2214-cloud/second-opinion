# T12 · Accessibility modes and ghost-hand onboarding

**Agent:** Claude Code · **When:** D5 Sat 14 Nov

**Goal:** All accessibility modes and the 2 min 10 s ghost-hand tutorial work, then Gate 2.

## Inputs (read first)
- docs/04-interaction-and-accessibility-spec.md
- docs/01-PRD.md (5.2, 5.6)
- spikes/S5.md

## Allowed files (edit only these)
- src/access/**
- src/game/**
- src/ui/**
- src/scene/**

## Steps
1. Implement high contrast, calm (calm: true in createShiftRuntime), one-hand mode and the text-size option, applied live.
2. Implement gaze-dwell if S5 passed: dwell ring, 1.2 s default, 0.8 to 2.0 s configurable, cancel on look-away. If S5 failed, skip and note it.
3. Build the six-beat ghost-hand tutorial. One short line at a time. Skippable only after first completion.
4. Tracking-loss freeze: stop tick, show 'Show your hands to continue.', resume when tracking returns.

## Acceptance (must all pass)
- [ ] Full shift with one hand, sound off, and in calm mode
- [ ] Greyscale screenshots show three distinct tray shapes
- [ ] Tutorial completes in under 2 min 10 s when scripted

## Do not
- No new gestures that need two hands
- Do not remove shape coding in high contrast

## Report format
Screenshots and which modes shipped.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T12: Accessibility modes and ghost-hand onboarding.
Goal: All accessibility modes and the 2 min 10 s ghost-hand tutorial work, then Gate 2.
Inputs: docs/04-interaction-and-accessibility-spec.md; docs/01-PRD.md (5.2, 5.6); spikes/S5.md.
Allowed files: src/access/**; src/game/**; src/ui/**; src/scene/**.
Steps:
1. Implement high contrast, calm (calm: true in createShiftRuntime), one-hand mode and the text-size option, applied live.
2. Implement gaze-dwell if S5 passed: dwell ring, 1.2 s default, 0.8 to 2.0 s configurable, cancel on look-away. If S5 failed, skip and note it.
3. Build the six-beat ghost-hand tutorial. One short line at a time. Skippable only after first completion.
4. Tracking-loss freeze: stop tick, show 'Show your hands to continue.', resume when tracking returns.
Acceptance: Full shift with one hand, sound off, and in calm mode | Greyscale screenshots show three distinct tray shapes | Tutorial completes in under 2 min 10 s when scripted
Do not: No new gestures that need two hands | Do not remove shape coding in high contrast
Report: Screenshots and which modes shipped.
```
