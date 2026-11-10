# 05 · Content specification

All content is **fictional game logic**. It is not clinical guidance. The triage answers come from a deterministic scoring rubric in `data/triage-rubric.json`, never from a language model, never from real data.

## 1. Case pool (`data/cases.seed.json`)

| Property | Value |
|---|---|
| Size | 60 cases, generated from `data/case-templates.json` with seed `second-opinion-v1` |
| Zones | 18 Green, 24 Amber, 18 Red |
| Difficulty | d1 12 (clear), d2 27 (medium), d3 21 (near a zone boundary) |
| Categories | cardiac, breathing, injury, children, infection (12 cases each) |
| Fields | `id, category, ageBand, complaint, flags[], vitals{pulse,sbp,dbp,spo2,temp}, score, truthZone, difficulty, whyLine` |
| Truth | `triageScore()` in `rubric.js`: points from vital bands and flags. Green below 3, Amber 3 to 5, Red 6 or more |
| Validation | `node core-spec/tools/validate-cases.js` checks quotas, borderline count (≥ 8), duplicates, text safety and plausibility, and recomputes every score |

**To add or change cases:** edit `case-templates.json`, run `node core-spec/tools/generate-cases.js <seed>`, run validation, run the balance gate. Never hand-edit `truthZone`.

### Writing rules for complaint text

- 4 to 12 words, plain English, present tense, no names, no places, no brands.
- Mild theme. No gore, no graphic injury, no death, no real conditions presented as a diagnosis claim.
- Abstract patient figures in the scene. The text carries the information, not realistic bodies.
- Vitals are always shown with a unit and in a fixed order: pulse, blood pressure, oxygen, temperature.
- Child cases use the child bands. The card shows "Child" in the age band.

## 2. Advisors (`data/advisors.json`)

| Advisor | Voice | Sample line | Teaches |
|---|---|---|---|
| **Dash** | Short, snappy | "Quick read: Amber." | Speed is fine until it is not (children) |
| **Sage** | Careful, a little anxious | "Better safe than sorry: Red." | Over-cautious advice has a cost |
| **Ledger** | Dry, specialist | "Specialist read: Green." | Expertise does not transfer between domains |
| **Orator** | Long, assured, persuasive | "Textbook presentation. The numbers line up perfectly with Red. I would stake my reputation on Red." | **Fluency is not accuracy** |
| **Echo** (stretch) | Warm flatterer | "Great instincts. Amber." | Agreement is not evidence |

Rules:

1. The advisor's **hidden reliability is never shown** (FR-33). Not in the UI, not in the debrief as a number.
2. Each advisor has a stated-confidence **style** (medium, high, very high) that is independent of accuracy.
3. Lines come from templates with a `{call}` slot, the zone name in plain text. Do not put zone names in colour alone.
4. Add at most 3 lines per advisor for variety. Orator's lines are intentionally longer.

## 3. Debrief copy (`data/debrief-lines.json`)

Order on screen: headline → Calibration index with over and under rates → 1 to 3 findings → one next step → trust map.

Tone rules (also enforced in the file):

- Name the behaviour, not the person.
- Pair every observation with a next step.
- Never scold. No medical claims.
- One short line at a time.

Headlines: balanced, over-reliance, under-reliance, mixed, not enough data. Findings: advisor over/under patterns, drift noticed or missed, verify yield, surge accuracy.

## 4. UI strings (all English, all short)

| Where | String |
|---|---|
| Start | "Second Opinion" / "Commit your call. Then see if the AI agrees." |
| Start button | "Start" |
| Play-area notice | "Sit at a table. Keep drinks away from your hands." |
| Plane search | "Looking for your table…" then after 5 s "Using a virtual table." |
| Patient arrives | (no text, the card and the sound carry it) |
| Commit prompt | "Make your own call first." |
| Keep button | "Keep" |
| Verify disabled | "No second opinions left." |
| Missed window | "Too slow: auto-Amber, −3." |
| Tracking lost | "Show your hands to continue." |
| Pause | "Paused" with "Resume", "Re-centre", "Settings" |
| Drift cue (badge) | "update installed" (verbatim from `advisors.json`) |
| Debrief title | "Shift review" |
| Index label | "Calibration index" and "Not enough data yet" |
| Footer note | "Fictional game logic. Not medical advice." |

No jargon in the player-facing text. The words "automation bias" and "calibration" appear only in the debrief label and the description, never in the tutorial.

## 5. Tutorial script

See `04-interaction-and-accessibility-spec.md` section 6. One short line per beat, ghost hand does the demonstrating.

## 6. Names and branding

- Working title: **Second Opinion**. [VERIFY] search the Meta Horizon Store and Devpost for a clash before using it in the submission. Fallback titles: *Calibrate*, *Trust Ward*, *Four Advisors*.
- Original characters only. No logos, no real brands, no real people, no copyrighted characters (NFR-10, RC-09).
- Audio and art: create originals or use licences that allow redistribution. Keep a `CREDITS.md`.

## 7. Content freeze

Content (case pool, advisor lines, debrief copy) is frozen at **Sat 14 Nov EOD**. After that only typo fixes. Any change to `case-templates.json` after freeze requires re-running validation **and** the balance gate.
