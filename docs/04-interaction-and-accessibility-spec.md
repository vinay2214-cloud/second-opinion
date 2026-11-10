# 04 · Interaction and accessibility specification

**Rule RC-01:** the whole game must work **with hands only, end to end**. Gaze and rays are alternatives, never requirements.
**Rule NFR-05:** seated, everything inside a **60 cm (2 ft) radius**. No walking, no leaning far.

Sizes and timings below are **design starting values to test on device**, not standards. Change them in `data/` or in one `config.ts`, not in scattered code.

## 1. Action map

| Action | Hands (primary) | Alternative | Result |
|---|---|---|---|
| Read the vitals card | **Poke** the card | Gaze-dwell on the card | Card expands within 150 ms (FR-21) |
| Commit a call | **Pinch-grab** the patient token, release over a tray | Ray-grab from distance, or gaze-dwell on token then on tray | Runtime `commit()`, stamp feedback (FR-22) |
| Hear a second opinion | **Poke** an advisor plinth | Gaze-dwell on the advisor | Runtime `verify()`, costs 1 token and 3 s (FR-24) |
| Keep the call | **Poke** the Keep button | Gaze-dwell on Keep | Runtime `finalize(i, commit)` |
| Change the call | Drag the token to another tray | Gaze-dwell on token then on the other tray | Runtime `finalize(i, newZone)` |
| Pause | Wrist menu pause, or a **Pause** button on the table edge | Gaze-dwell on Pause | Stop calling `tick`, dim the table |
| Re-centre ward | Poke **Re-centre** on the wrist menu or table edge | Gaze-dwell | Re-anchors the ward (FR-05) |
| Skip the tutorial | Poke **Skip** (only after first completion, FR-11) | Gaze-dwell | Starts module |

Do not use any gesture that needs two hands at once. Do not require a sustained pose.

## 2. Feedback for every action (visual twin for every sound)

| Event | Visual | Audio | Timing |
|---|---|---|---|
| Token hover / near | Soft outline pulse | Quiet tick | immediate |
| Token picked up | Token lifts about 1 cm, trays highlight, **advice stays hidden** | Pickup tick | immediate |
| Commit (release over tray) | Snap with small overshoot, ring pulse on the tray, brief hold | Stamp | 0 to 150 ms, then 0.6 s hold |
| Advice appears | Advisor badge lights, speech card slides in | Advisor motif (one per advisor) | after the 0.6 s hold |
| Verify | Token spent animation, clock jumps 3 s, second advisor speaks | Soft coin-like click, then motif | immediate |
| Resolve right | Truth tray glows, green check mark and score toast | Rising reveal sting | 200 ms |
| Resolve wrong | Truth tray glows, `whyLine` shown, toast with negative delta | Low reveal sting (not harsh) | 200 ms |
| Window running out | Token ring shrinks, last 8 s ring turns amber with a dashed edge (not colour only) | Slow tick | last 8 s |
| Drift cue | Small "update installed" badge on one advisor, easy to miss by design | One soft chime, **only** in non-calm mode | at patient 9 |
| Surge | Two tokens slide in 4 s apart, shorter ring | Soft double chime | at patients 6 and 11 |

No haptics are assumed (hand tracking has none). Do not promise haptic feedback in the form text.

## 3. Target sizes and placement (starting values)

| Element | Size | Distance from player | Why |
|---|---|---|---|
| Poke targets (advisor plinths, Keep, Pause) | ≥ 3 cm across, ≥ 2 cm gap | 35 to 55 cm | Hand tracking is jittery, big gaps avoid mis-pokes |
| Gaze-dwell targets | ≥ 4 cm across | 35 to 60 cm | Eye tracking accuracy is lower than hands |
| Trays | about 11 cm square, 4 cm gap | 40 to 55 cm | Easy drop |
| Token | about 5 cm | arrival lane | Easy to grab, also with a ray |
| Text on cards | ≥ 1.2 cm tall at 50 cm (FR-20) | n/a | Readability |
| Essential UI | inside the central field of view, about 70° wide by 66° tall (FR-56) | n/a | Avoids head-turning |

## 4. Accessibility modes (all toggle at any time, saved locally with safe fallback)

| Mode | What it changes | Requirement | Test |
|---|---|---|---|
| **Shape-coded trays** (always on) | Red triangle, Amber diamond, Green circle, plus a text label "RED / AMBER / GREEN" and colour | FR-50 | Screenshot in greyscale, still distinguishable |
| **High contrast** | Dark panels, bright text, thicker outlines, muted scenery | FR-51 | Toggle mid-shift without state loss |
| **Calm mode** | Arrival and window times ×1.5 (`calm` in `createShiftRuntime`), no drift chime, no double chime on surges | FR-52 | Full shift passes, summary still scores |
| **One-hand mode** | All actions available to the dominant hand only, Pause and Re-centre on the table edge instead of a wrist menu, no two-hand gestures | FR-53 | Complete a shift with the other hand out of view |
| **Gaze-dwell mode** | Look at a target and hold. Default **1.2 s**, range 0.8 to 2.0 s. Progress ring fills so the player sees it coming. A look-away cancels | FR-54 (SHOULD) | Complete a shift eyes-only. **Needs spike S5** |
| **Audio redundancy** | Every cue has a visual twin (section 2) | FR-55 | Mute test: play a shift with sound off |
| **Text size** | Normal / Large (×1.25) | stretch | Layout does not overflow |

## 5. Comfort and safety

- No artificial locomotion, no camera movement, no head-locked objects except a small, optional wrist or table-edge menu.
- No flashing faster than 3 times per second. Animations ≤ 300 ms for UI, no strobes.
- Passthrough stays visible. Keep the ward diorama about 60 × 40 cm and the clutter low.
- Play-area notice on the start screen: "Sit at a table. Keep drinks away from your hands." (short, plain).
- If tracking is lost: freeze the clock (stop `tick`), show "Show your hands" on the table, resume when tracking returns.
- If a plane is not found within **5 s** or permission is declined: place a **virtual table** (FR-04). No error screen.

## 6. Ghost-hand onboarding (FR-10, target ≤ 2 min 10 s, one short line at a time)

| Beat | Target time | Player sees | Player does | Line (max one) |
|---|---|---|---|---|
| 1. Place | 0:00–0:20 | Highlighted table plane (or virtual table) | Pinch to confirm | "Place your ward." |
| 2. Arrive | 0:20–0:35 | A token slides in, vitals card above it | Poke the card | "A patient arrives. Poke to read." |
| 3. Commit | 0:35–1:10 | **Ghost hand** grabs the token, drops it on a tray | Grab and release it on a tray | "Make your own call first." |
| 4. Advice | 1:10–1:30 | Advisor Dash speaks after the 0.6 s hold | Read | "Now hear the advisor." |
| 5. Decide | 1:30–1:50 | Ghost hand pokes Keep once | Poke Keep, or drag to change | "Keep your call, or change it." |
| 6. Reveal | 1:50–2:10 | Truth tray glows, `whyLine`, score toast | Read | "That is the answer." |

Pass criterion: a fresh player completes the first patient **unaided** (playtest in `08-qa-test-plan.md`). Skippable only after first completion, with the skip flag stored safely.

## 7. Wrist menu vs table-edge menu

The wrist menu is a **preference** because it is hand-native, but its API is not confirmed (spike S3). Ship the **table-edge menu** first (Pause, Re-centre, Settings), then add the wrist menu only if time allows. Both call the same two functions: `pauseShift()` and `recentre()`.

## 8. Acceptance checklist

- [ ] Every action in section 1 works with hands only.
- [ ] A full shift with sound off passes.
- [ ] A full shift with one hand passes.
- [ ] Screenshots in greyscale show three distinct tray shapes.
- [ ] High contrast, calm, and gaze-dwell toggle mid-shift with no state loss.
- [ ] Tracking-loss freeze and resume works.
- [ ] Plane-not-found fallback reaches play within 5 s.
