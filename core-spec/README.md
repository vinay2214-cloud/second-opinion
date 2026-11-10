# core-spec — executable specification of the Second Opinion game core

Plain JavaScript (ESM, Node 20+), no dependencies. It defines the rules and proves them with tests so that AI coding agents port the same behaviour into TypeScript.

```bash
npm test                          # 40 tests
node tools/validate-cases.js      # 60 cases: quotas, plausibility, rubric recompute
node tools/generate-cases.js [seed]   # regenerate data/cases.seed.json (validates first)
node tools/simulate-balance.js [days=300] [playerAccuracy=0.7]   # balance gate
```

| File | Role |
|---|---|
| `src/rng.js` | Seeded RNG (xfnv1a + mulberry32). All randomness goes through here |
| `src/rubric.js` | Game triage scoring: vitals bands + flags to zone. Game logic only |
| `src/advisors.js` | Hidden reliability, drift effect, deterministic advice |
| `src/reliance.js` | switch-right, hold-right, switch-wrong, hold-wrong; Calibration index; trust map |
| `src/scoring.js` | Outcome points, speed bonus, restraint bonus, verify yield |
| `src/generator.js`, `src/validate.js` | Case generation and validation |
| `src/shift-director.js` | Builds a whole shift from a seed |
| `src/shift-runtime.js` | **The state machine.** commit, verify, finalize, tick, publicView |
| `src/debrief.js` | Index, rates, findings, next step |

**Porting rules:** keep names and signatures, keep every number in `data/`, never read the clock or `Math.random` in the core, keep the UI on `publicView()`.
