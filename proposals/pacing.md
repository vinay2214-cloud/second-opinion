# Proposal: shorter gap between patients in modules 1 and 2

**From:** Claude Code (scene lane) · **For:** owner decision, then Astra (`data/shift-config.json`, `simulate-balance`) · **Date:** Tue 10 Nov 2026 · **Status:** proposal only, nothing changed

## What I saw (emulator only)
- `arrivalGapSeconds` is `[28, 38]` for every module. A scripted player commits and finishes a patient in about 8 to 15 s, so the table sits empty for 15 to 25 s between patients.
- In Module 1 (6 patients, Dash only, no tokens) there is nothing to do in that gap. The scripted Module 1 shift on 10 Nov took 2 min 50 s from Start to debrief, of which about 1 min 30 s was waiting for the next patient.
- Module 3 is different: with 4 advisors, tokens, surges and drift, the 28 to 38 s gap is used, and the 8:00 hard cap and the 6:36 to 7:26 simulated length depend on it. I am **not** proposing a change to Module 3.

## Proposal
Add an optional per-module gap override and use it for the first two modules:

| Module | Patients | Gap now | Proposed gap | Expected length |
|---|---|---|---|---|
| module1 | 6 | 28 to 38 s | **16 to 22 s** | about 1:50 instead of 2:50 to 3:10 |
| module2 | 10 | 28 to 38 s | **20 to 28 s** | about 3:50 instead of 5:10 |
| module3 | 14 | 28 to 38 s | unchanged | 6:36 to 7:26 (simulated) |

Shape in `data/shift-config.json` (illustrative, Astra decides the exact form):
```json
"modules": {
  "module1": { "...": "...", "arrivalGapSeconds": [16, 22] },
  "module2": { "...": "...", "arrivalGapSeconds": [20, 28] },
  "module3": { "...": "..." }
}
```
`buildShift` would read `mod.arrivalGapSeconds ?? sc.arrivalGapSeconds`. The window (50 s) stays, so overlapping patients become more common in module 2. That is intended: it rehearses the module 3 pressure gently.

## Why not change it in the scene lane
Arrival times come from `buildShift` in `src/core` and the gap from `data/`. Both are outside my Allowed files, and parity with `core-spec` must stay at 0 diffs, so the change also needs the reference JS and a re-run of `validate-cases` and `simulate-balance`.

## Risks
- Parity: `core-spec/src/shift-director.js` must change in step with the TS port.
- The Module 2 pass condition (index ≥ 65) needs enough disagreements; a faster shift does not change the patient count, so the index should be unaffected.
- Remote Quest tester should confirm that 16 s is not too fast for a first-time player reading the vitals card.
