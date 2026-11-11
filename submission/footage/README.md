# Footage kit

Stills from one scripted emulator run, in the order of the video storyboard in `docs/09-submission-kit.md` section 5. They are for planning the edit; the video itself must be a screen recording of real play.

**Source:** IWSDK emulator with emulated hands (not a Quest), Module 3, default settings, 11 Nov 2026. Two scripted runs, both played to get every call right:
- Shots 01 to 13: seed `ward-a`, the whole shift. Score 179, Calibration index 100, 0 console errors.
- Shots 14 and 15: seed `ward-128`, played to patient 9 and stopped there. 0 console errors up to that point. These are the two moments `ward-a` cannot show.

Say "recorded in the IWSDK emulator" in the video description. Stills carry no sound; see "What the footage still cannot show".

## Shots
| Storyboard slot | File | What it shows |
|---|---|---|
| 0:00 hook | `01a-hook-token-in-hand.png` | Token in the hand over the Amber tray; no advice on screen |
| 0:00 hook | `01b-hook-advisor-disagrees.png` | Committed Amber; Dash says Red |
| 0:10 the table | `02-table-and-modules.png` | Ward, trays, four named advisors, module buttons |
| 0:25 play | `03-read-the-card.png` | Vitals card opened by a poke |
| 0:25 play | `04-reveal-and-score.png` | Answer Amber, score for the patient |
| 0:55 Orator | `14a-orator-leads-very-sure-says-amber.png` | Seed `ward-128`, patient 3. The player committed Red. Orator leads, "very sure", long confident quote: Amber |
| 0:55 Orator | `14b-orator-was-wrong-answer-red.png` | Same patient after Keep: the answer is Red. Orator was wrong while leading |
| 0:55 Orator (older, `ward-a`) | `05-second-opinion-orator-and-cost.png`, `06-orator-very-sure.png` | Orator wrong as a second opinion; Orator leading and right |
| 0:25 play (change) | `07-switched-and-right.png` | Token moved to another tray after advice, and it was right |
| 1:15 verify | `05-second-opinion-orator-and-cost.png` | "Second opinion: 1 token spent, clock +3 s", one pip used |
| (surge) | `08-surge-two-patients.png` | Two tokens with window rings |
| 1:35 drift | `15a-before-update-dash-right.png` | Seed `ward-128`, patient 1, a breathing case. Dash says Amber and is right (before the update) |
| 1:35 drift | `15b-after-update-dash-says-amber.png` | Patient 9, a breathing case. Dash carries the "update installed" tag and says Amber. The player committed Red |
| 1:35 drift | `15c-dash-was-wrong-answer-red.png` | Same patient after Keep: the answer is Red. The drifted advisor's mistake, with the tag still showing |
| 1:35 drift (older, `ward-a`) | `09-drift-update-installed.png` | "update installed" tag in front of Ledger, no mistake |
| 1:55 debrief | `10-debrief-calibration.png` | Shift review, Calibration index, rates |
| 1:55 debrief | `11-trust-map.png` | Trust map view |
| 2:15 accessibility | `12a` to `12d` | Greyscale shapes, settings menu, high contrast with big text, one hand in calm mode |
| optional | `13-tutorial-ghost-hand.png` | Ghost hand showing the carry |

## Seed for the video: `ward-128`
Found with `node submission/footage/find-seed.mjs` (it builds Module 3 shifts with `core-spec` and lists seeds that have both moments; 119 of the 326 seeds tried do). `node submission/footage/find-seed.mjs ward-128` prints the shift patient by patient. In `ward-128`:
- Patient 1 (breathing, answer Amber): Dash leads and is right.
- **Patient 3 (injury, answer Red): Orator leads, very sure, says Amber. Wrong.**
- Patient 9 onward: Dash has drifted on breathing cases and shows the "update installed" tag.
- **Patient 9 (breathing, answer Red): Dash leads and says Amber. Wrong.**
- Orator also leads and is wrong on patients 11 and 14.

On the live site the seed is the address ending `?seed=ward-128`. Recording the whole video on this one seed keeps the story consistent; shots 01 to 13 would then need re-shooting on it (not done).

## What the footage still cannot show
- **Sound.** The stills are silent, and the emulator's browser is headless, so nobody has heard the game's five cues yet.
- **A whole shift on `ward-128`.** The second run stopped after patient 9; there is no debrief or trust map for this seed.
- **The mistake on the result screen.** After Keep the panel shows the answer and the reason, not the advisor's call. The advisor's wrong call is on the shot before it (14a, 15b). In video the two follow each other.

## Re-running it
With the dev server up (`npx iwsdk dev up --ai-mode agent`), from the project root: `sh submission/footage/footage.sh`. It takes about 7 minutes and overwrites shots 01 to 11. To record video, run the dev server with a visible window (`npm run dev`) and screen-record while the script plays, or play by hand with the emulator's hand controls.

The second run: set the seed first. In a dev build that is `seed: 'ward-128'` in `src/game/testRun.ts` (do not commit it); the emulator's command line cannot open an address with `?seed=`. Then `sh submission/footage/footage-ward-128.sh` (about 5 minutes, overwrites shots 14 and 15). It commits the right answer for patients 1 to 9 and presses Keep each time.

What the first script does, patient by patient: P1 commit Amber, ask Orator, Keep. P2 Amber, Keep. P3 Red, Keep. P4 Amber then move to Green. P5 Green, Keep. P6 to P8 Red, Keep. P9 to P11 Amber, Keep. P12, P13 Green, Keep. P14 Amber, Keep. Then Map.
