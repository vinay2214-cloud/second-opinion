# 08 · QA and test plan

Three layers: **automated** (runs in seconds, every commit), **emulator** (agents can run it with the IWSDK MCP), **human** (only you can do this). Do all three before every gate.

## 1. Automated (every commit)

| Check | Command | Pass |
|---|---|---|
| Core golden tests | `npm test` (core-spec now, `tests/` after the port) | All green (40 at the time of writing) |
| Case pool validity | `node core-spec/tools/validate-cases.js` | `valid` |
| Balance gate | `node core-spec/tools/simulate-balance.js 300 0.7` | Calibrated policy beats always-follow and never-follow on **both** outcome and index |
| Build | `npm run build` | No errors, `dist/` produced |
| Bundle size | check `dist/` size | Total assets ≤ 15 MB (NFR-02) |

**Balance gate caveat.** At player commit accuracy of about 0.8 or higher, "never follow the advisor" nearly ties the calibrated policy, which would weaken the game's point. If you raise or lower accuracy and the gate fails, raise the share of difficulty-3 cases or lower Dash and Sage reliability in `data/advisors.json`, then re-run validation and the gate. Do this **before** content freeze.

## 2. Emulator checks (agents can drive these via the IWSDK MCP)

| Check | How | Pass |
|---|---|---|
| Console clean | MCP console tool during a full shift | Zero errors, zero unhandled rejections |
| No-leak invariant | Screenshot at "token held" state | No advice text anywhere on screen |
| Commit loop | Scripted input: pick up token, release on a tray, poke Keep | `resolved` event, score toast |
| Verify cost | Poke an advisor | Token count −1, clock +3 s |
| Window timeout | Do nothing for 50 s | Auto-Amber, −3, logged as missed |
| Pause and resume | Pause for 20 s | Clock does not advance, resume continues |
| Hard cap | Let the shift run | Ends by 8:00 |
| Determinism | Same daily seed twice | Identical patients and advice |

## 3. Human tests (you, the emulator, a remote Quest tester, and one fresh person)

### 3.1 First-five-minutes test (the most valuable test)

Find **one person who has never seen the game** (3 to 5 people is better). Do not explain anything. Say only: *"Put this on and play."* Watch silently. Note the time and where they hesitate.

| Question | Pass |
|---|---|
| Did they place the ward and pick up a token without help? | Yes, within 2 minutes |
| Did they commit before the advice appeared? | Yes |
| Did they understand keep or change? | Yes, by the second patient |
| After one shift, ask: "Which advisor would you trust more, and why?" | 3 of 5 give a reason that matches reality |
| Anything they tried that did not work? | Write it down. Fix the top 3 |

Target: **4 of 5** fresh players commit a call unaided by minute 2.

### 3.2 Hands-only and accessibility

- [ ] Full shift with hands only, no controllers.
- [ ] Full shift with one hand.
- [ ] Full shift with sound off.
- [ ] Greyscale screenshots: three distinct tray shapes.
- [ ] High contrast toggled mid-shift.
- [ ] Calm mode shift completes.
- [ ] Gaze-dwell shift completes (if it shipped).
- [ ] Tracking-loss freeze and resume.

### 3.3 Seated and field-of-view

- [ ] Everything reachable within about 60 cm while seated.
- [ ] No head-turn needed for essential UI (central about 70° × 66°).
- [ ] Text ≥ 1.2 cm tall at 50 cm, readable at a glance.
- [ ] Table placement works on a plain desk and on a cluttered desk. The 5 s virtual-table fallback works.

### 3.4 Without a headset (your situation)

**What the rules say:** a headset is **not required**. Judges use a **Quest 3 or 3S**. Footage may be "as viewed on a Meta Quest device or via XR Simulator or another equivalent emulator". Your experience must not need any other device.

**What to use:** the IWSDK dev emulator (`npx iwsdk dev up`) and the **Immersive Web Emulator** browser extension. Meta's posts (2023, so re-check) say the extension supports immersive AR sessions, anchors and plane detection in a simulated room. They do not mention hand simulation, so confirm it in spike **S8**. The IWSDK tooling can also simulate input from the agent side.

**What an emulator cannot tell you (and what to do about it):**

| Unknown without a headset | Mitigation |
|---|---|
| Real frame rate on Quest hardware (the judging criteria mention 60 fps) | Conservative budget (`03` section 8). As a rough proxy only, profile in desktop Chrome with **CPU throttling 4x to 6x** and keep frames comfortably fast. This is a heuristic, not proof |
| Real hand-tracking jitter and pinch thresholds | Large targets (≥ 3 cm, gaps ≥ 2 cm), large snap radius on trays, ray-grab as a built-in alternative, forgiving release zones |
| Plane detection in a real, messy room | 5 s timeout and the virtual table fallback (FR-04) |
| Readability and comfort at real scale | Text ≥ 1.2 cm at 50 cm, central field of view only, no head-locked UI |
| Quest Browser quirks | **Remote tester** (below) |

**Remote tester plan (the most valuable thing you can do):** find at least one person with a **Quest 3 or 3S**: a friend, a colleague, your university, a local VR cafe, or ask in the Meta developer forum or the competition's Devpost discussion board. Send them your GitHub Pages link and this script:

1. Open the link in the Quest Browser. Tap Start and allow the permissions.
2. Play one full shift. Do not coach yourself, say what confuses you.
3. Record your view (Quest can record video) and add `?debug=1` to the link for the **debug overlay** (frame rate, tracking state, last error). Screenshot it.
4. Send me the recording, the screenshot and anything that felt wrong.

Schedule: **first run Sat 14 Nov**, **retest Sun 15 Nov** after fixes, **fresh-profile run Tue 17 Nov** (3.5). Build the `?debug=1` overlay and a `?safe=1` mode (no transparency, simplest materials) into task T14.

**Honesty:** only write "tested on Quest" in the form if a remote tester really did it. Otherwise write that it was developed with the IWSDK emulator and the Immersive Web Emulator.

**Checklist (remote tester or emulator):**

- [ ] Frame rate smooth through a surge (overlay).
- [ ] Cold start under 10 s on normal Wi-Fi.
- [ ] Pinch-grab and release onto trays works on the first or second try.
- [ ] Pokes hit the intended target.
- [ ] 20 minutes of play, no crash.

### 3.5 Fresh-profile test (**Tue 17 Nov, blocker if it fails**)

1. Open the public Pages URL in a **new browser profile** or a private window, logged out of everything.
2. No 404s in the network panel, no console errors.
3. The start screen appears, a session starts, a full shift completes, the debrief shows.
4. Ask your remote tester to repeat it on a Quest 3 or 3S in the Quest Browser, from a cold start.
5. Repeat after clearing site data.

## 4. Release criteria (from the PRD)

All M requirements pass. Tests, validation and the balance gate pass. Fresh-profile build plays a full shift with hands only and no console errors. Video, description, tagline and form complete and verified. Deployment frozen after submission.

## 5. Bug triage

| Severity | Definition | Rule |
|---|---|---|
| **S0** | Cannot start, cannot finish a shift, leaks advice before commit, crashes | Fix now, nothing else matters |
| **S1** | Wrong score or reliance class, broken accessibility mode, console errors | Fix before the next gate |
| **S2** | Visual glitch, awkward feel, confusing text | Fix if time, otherwise log |
| **S3** | Nice to have | Log only |

After Mon 16 Nov EOD, only S0 and S1.

## 6. Test log template (copy into `docs/10-risks-and-decisions.md` daily)

```
Date: __  Build tag: __  Tester: __  Device: emulator / Quest __
Passed: __   Failed: __   New bugs (severity): __
Top 3 things the fresh player struggled with: 1) __ 2) __ 3) __
```
