# T02 · Port the core to TypeScript with the same golden tests

**Agent:** GPT-6 Astra (Codex) · **When:** D0 to D1

**Goal:** src/core is a TypeScript port of core-spec/src with identical behaviour, proved by the same tests and a parity check.

## Inputs (read first)
- core-spec/src/*.js
- core-spec/test/*.js
- data/*.json
- docs/03-technical-spec.md (section 5)

## Allowed files (edit only these)
- src/core/**
- tests/**
- tsconfig*.json
- package.json (test scripts and dev dependencies only)
- tools/parity.mjs

## Steps
1. Convert each file in core-spec/src to TypeScript with the same exported function names and signatures. Import JSON with resolveJsonModule, not fs.
2. Define types: Zone, Case, Advice, Shift, ShiftRuntime, PublicView, LogEntry, Debrief. No any in exported signatures.
3. Port both test files to Vitest with the same assertions (33 tests; the 7 coach tests are ported in T15).
4. Write tools/parity.mjs that runs the JS and TS implementations on 100 seeds and compares buildShift output, advice and summary. It must print 0 diffs.
5. Do not change any rule, number or data file.

## Acceptance (must all pass)
- [ ] npm test: 33 pass (coach tests come with T15)
- [ ] node tools/parity.mjs prints 0 diffs over 100 seeds
- [ ] grep finds no Date, Math.random, fs, three or @iwsdk in src/core
- [ ] tsc --noEmit passes

## Do not
- Do not change behaviour
- Do not touch src/scene, src/ui or src/game
- Do not add dependencies other than typescript and vitest

## Report format
Test output, parity output, list of types exported.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T02: Port the core to TypeScript with the same golden tests.
Goal: src/core is a TypeScript port of core-spec/src with identical behaviour, proved by the same tests and a parity check.
Inputs: core-spec/src/*.js; core-spec/test/*.js; data/*.json; docs/03-technical-spec.md (section 5).
Allowed files: src/core/**; tests/**; tsconfig*.json; package.json (test scripts and dev dependencies only); tools/parity.mjs.
Steps:
1. Convert each file in core-spec/src to TypeScript with the same exported function names and signatures. Import JSON with resolveJsonModule, not fs.
2. Define types: Zone, Case, Advice, Shift, ShiftRuntime, PublicView, LogEntry, Debrief. No any in exported signatures.
3. Port both test files to Vitest with the same assertions (33 tests; the 7 coach tests are ported in T15).
4. Write tools/parity.mjs that runs the JS and TS implementations on 100 seeds and compares buildShift output, advice and summary. It must print 0 diffs.
5. Do not change any rule, number or data file.
Acceptance: npm test: 33 pass (coach tests come with T15) | node tools/parity.mjs prints 0 diffs over 100 seeds | grep finds no Date, Math.random, fs, three or @iwsdk in src/core | tsc --noEmit passes
Do not: Do not change behaviour | Do not touch src/scene, src/ui or src/game | Do not add dependencies other than typescript and vitest
Report: Test output, parity output, list of types exported.
```
