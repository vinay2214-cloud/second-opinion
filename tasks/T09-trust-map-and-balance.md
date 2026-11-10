# T09 · Trust map, debrief checks and balance gate re-run

**Agent:** GPT-6 Astra (Codex) · **When:** D4 Fri 13 Nov

**Goal:** Trust map data and renderable model, plus independent verification of debrief and balance after any data change.

## Inputs (read first)
- src/core/reliance.ts (trustMap)
- src/core/debrief.ts
- core-spec/tools/simulate-balance.js
- docs/08-qa-test-plan.md (section 1)

## Allowed files (edit only these)
- src/core/**
- tests/**
- tools/**
- src/ui/TrustMapModel.ts

## Steps
1. Write TrustMapModel: advisor by category grid with followed rate and right rate, 'not enough data' cells.
2. Property tests: over and under rates are in [0,1], index is in [0,100] or null, counts sum correctly, same log gives same debrief.
3. Run the balance gate at accuracies 0.6, 0.7 and 0.8 and report the three results.
4. If the gate fails at 0.7, propose (do not apply) a change to data/advisors.json or the difficulty mix.

## Acceptance (must all pass)
- [ ] npm test passes
- [ ] Balance gate result table for 0.6, 0.7, 0.8 in the report

## Do not
- Do not edit data/*.json yourself
- Do not change scoring rules

## Report format
Result table and any proposals.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T09: Trust map, debrief checks and balance gate re-run.
Goal: Trust map data and renderable model, plus independent verification of debrief and balance after any data change.
Inputs: src/core/reliance.ts (trustMap); src/core/debrief.ts; core-spec/tools/simulate-balance.js; docs/08-qa-test-plan.md (section 1).
Allowed files: src/core/**; tests/**; tools/**; src/ui/TrustMapModel.ts.
Steps:
1. Write TrustMapModel: advisor by category grid with followed rate and right rate, 'not enough data' cells.
2. Property tests: over and under rates are in [0,1], index is in [0,100] or null, counts sum correctly, same log gives same debrief.
3. Run the balance gate at accuracies 0.6, 0.7 and 0.8 and report the three results.
4. If the gate fails at 0.7, propose (do not apply) a change to data/advisors.json or the difficulty mix.
Acceptance: npm test passes | Balance gate result table for 0.6, 0.7, 0.8 in the report
Do not: Do not edit data/*.json yourself | Do not change scoring rules
Report: Result table and any proposals.
```
