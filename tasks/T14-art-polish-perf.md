# T14 · Art, polish and performance pass

**Agent:** Claude Code · **When:** D6 Sun 15 Nov

**Goal:** Raise Polish to a clear 4: cohesive look, good feel on commit and reveal, smooth performance.

## Inputs (read first)
- docs/02-game-design.md (sections 3, 12)
- docs/03-technical-spec.md (section 8)
- docs/08-qa-test-plan.md (3.3, 3.4)

## Allowed files (edit only these)
- src/scene/**
- src/ui/**
- src/audio/**
- public/**

## Steps
1. One palette, flat low-poly, soft ambient light, a blob shadow under objects (no real-time shadows).
2. Juice pass: commit snap overshoot, ring pulse, reveal glow, score toast easing. All under 300 ms.
3. Performance pass: instance tokens and trays, remove per-frame allocations, cap texture sizes at 1024 px, check bundle under 15 MB.
4. Fix the top 3 issues from the first-five-minutes test.
5. Add a ?debug=1 overlay (frame time, tracking state, last error, build tag) and a ?safe=1 mode (no transparency, simplest materials) so a remote Quest tester can send useful evidence.

## Acceptance (must all pass)
- [ ] Bundle size under 15 MB
- [ ] No console errors across 5 full shifts
- [ ] ?debug=1 and ?safe=1 work on the deployed build
- [ ] A fresh player reaction check: 'it looks clean' (ask one person)

## Do not
- No new features
- No new art direction, polish what exists

## Report format
Before and after screenshots, bundle size, perf notes.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T14: Art, polish and performance pass.
Goal: Raise Polish to a clear 4: cohesive look, good feel on commit and reveal, smooth performance.
Inputs: docs/02-game-design.md (sections 3, 12); docs/03-technical-spec.md (section 8); docs/08-qa-test-plan.md (3.3, 3.4).
Allowed files: src/scene/**; src/ui/**; src/audio/**; public/**.
Steps:
1. One palette, flat low-poly, soft ambient light, a blob shadow under objects (no real-time shadows).
2. Juice pass: commit snap overshoot, ring pulse, reveal glow, score toast easing. All under 300 ms.
3. Performance pass: instance tokens and trays, remove per-frame allocations, cap texture sizes at 1024 px, check bundle under 15 MB.
4. Fix the top 3 issues from the first-five-minutes test.
5. Add a ?debug=1 overlay (frame time, tracking state, last error, build tag) and a ?safe=1 mode (no transparency, simplest materials) so a remote Quest tester can send useful evidence.
Acceptance: Bundle size under 15 MB | No console errors across 5 full shifts | A fresh player reaction check: 'it looks clean' (ask one person)
Do not: No new features | No new art direction, polish what exists
Report: Before and after screenshots, bundle size, perf notes.
```
