# Footage kit

Stills from one scripted emulator run, in the order of the video storyboard in `docs/09-submission-kit.md` section 5. They are for planning the edit; the video itself must be a screen recording of real play.

**Source:** IWSDK emulator with emulated hands (not a Quest), seed `ward-a`, Module 3, default settings, 11 Nov 2026. The run was played to get every call right: score 179, Calibration index 100, 0 console errors. Say "recorded in the IWSDK emulator" in the video description.

## Shots
| Storyboard slot | File | What it shows |
|---|---|---|
| 0:00 hook | `01a-hook-token-in-hand.png` | Token in the hand over the Amber tray; no advice on screen |
| 0:00 hook | `01b-hook-advisor-disagrees.png` | Committed Amber; Dash says Red |
| 0:10 the table | `02-table-and-modules.png` | Ward, trays, four named advisors, module buttons |
| 0:25 play | `03-read-the-card.png` | Vitals card opened by a poke |
| 0:25 play | `04-reveal-and-score.png` | Answer Amber, score for the patient |
| 0:55 Orator | `05-second-opinion-orator-and-cost.png` | Orator's long confident quote (wrong: the answer was Amber) |
| 0:55 Orator | `06-orator-very-sure.png` | Orator leading, "very sure" |
| 0:25 play (change) | `07-switched-and-right.png` | Token moved to another tray after advice, and it was right |
| 1:15 verify | `05-second-opinion-orator-and-cost.png` | "Second opinion: 1 token spent, clock +3 s", one pip used |
| (surge) | `08-surge-two-patients.png` | Two tokens with window rings |
| 1:35 drift | `09-drift-update-installed.png` | "update installed" tag in front of Ledger |
| 1:55 debrief | `10-debrief-calibration.png` | Shift review, Calibration index, rates |
| 1:55 debrief | `11-trust-map.png` | Trust map view |
| 2:15 accessibility | `12a` to `12d` | Greyscale shapes, settings menu, high contrast with big text, one hand in calm mode |
| optional | `13-tutorial-ghost-hand.png` | Ghost hand showing the carry |

## What the footage cannot show with this seed
- **Orator wrong while leading.** With `ward-a` Orator is right each time it leads. It is wrong as a second opinion on patient 1 (shot 05).
- **The drifted advisor making a visible mistake.** Ledger drifts on cardiac cases at patient 9, leads one later cardiac patient and is right. The tag is visible; a mistake is not.
- **Sound.** The game is silent.

## Re-running it
With the dev server up (`npx iwsdk dev up --ai-mode agent`), from the project root: `sh submission/footage/footage.sh`. It takes about 7 minutes and overwrites shots 01 to 11. To record video, run the dev server with a visible window (`npm run dev`) and screen-record while the script plays, or play by hand with the emulator's hand controls.

What the script does, patient by patient: P1 commit Amber, ask Orator, Keep. P2 Amber, Keep. P3 Red, Keep. P4 Amber then move to Green. P5 Green, Keep. P6 to P8 Red, Keep. P9 to P11 Amber, Keep. P12, P13 Green, Keep. P14 Amber, Keep. Then Map.
