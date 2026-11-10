# T05 · Safe persistence and settings

**Agent:** GPT-6 Astra (Codex) · **When:** D1 Tue 10 Nov

**Goal:** A storage wrapper that can never throw or break the game, plus a typed settings object.

## Inputs (read first)
- docs/03-technical-spec.md (section 9)
- docs/04-interaction-and-accessibility-spec.md (section 4)

## Allowed files (edit only these)
- src/persist/**
- tests/persist.test.ts

## Steps
1. Write safeStorage: get, set, remove, all wrapped in try/catch, with an in-memory fallback when localStorage is unavailable or throws.
2. Write settings with defaults: highContrast false, calm false, oneHand false, gazeDwell false, dwellSeconds 1.2, textScale 1.
3. Write history: last 30 shift summaries (index, score, date) and a streak counter keyed by local date string passed in by the caller.
4. Tests: a throwing localStorage, a full storage, missing storage, corrupted JSON.

## Acceptance (must all pass)
- [ ] npm test passes the new tests
- [ ] No test or code path throws on storage failure

## Do not
- Do not read the clock inside the module, take the date as a parameter
- No network

## Report format
Test output and the exported API.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T05: Safe persistence and settings.
Goal: A storage wrapper that can never throw or break the game, plus a typed settings object.
Inputs: docs/03-technical-spec.md (section 9); docs/04-interaction-and-accessibility-spec.md (section 4).
Allowed files: src/persist/**; tests/persist.test.ts.
Steps:
1. Write safeStorage: get, set, remove, all wrapped in try/catch, with an in-memory fallback when localStorage is unavailable or throws.
2. Write settings with defaults: highContrast false, calm false, oneHand false, gazeDwell false, dwellSeconds 1.2, textScale 1.
3. Write history: last 30 shift summaries (index, score, date) and a streak counter keyed by local date string passed in by the caller.
4. Tests: a throwing localStorage, a full storage, missing storage, corrupted JSON.
Acceptance: npm test passes the new tests | No test or code path throws on storage failure
Do not: Do not read the clock inside the module, take the date as a parameter | No network
Report: Test output and the exported API.
```
