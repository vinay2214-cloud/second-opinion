# Final checklist evidence (15 Nov 2026, `main`)

Everything here was checked in the IWSDK emulator (emulated hands, Chromium) or in a desktop Chromium. Nothing was run on a Quest. "Emulator" means it works there and has never been seen on a headset.

## 1. Claims check

| # | Claim | Result | Evidence |
|---|---|---|---|
| 1 | Three modules: 6, 10 and 14 patients, all open from the start | PASS | `data/shift-config.json` (module1 6, module2 10, module3 14); start panel lists all three with green buttons (`video/clips/02-table-and-ward.mp4`, `video/clips/08-*.mp4`) |
| 2 | Second-opinion (verify) tokens cost clock time; unspent tokens score | PASS (emulator) | `shift-config.json` `clockCostSeconds: 3`, `unspentTokenBonus: 1`; `src/core/scoring.ts:24`; log `verify 3 orator ok=true tokens=3 clock 372.10s -> 369.10s`; panel "Second opinion: 1 token spent, clock +3 s" (`video/clips/05-*.mp4`); shift end `restraint=3 tokensLeft=3` |
| 3 | Drift with an "update installed" tag | PASS (emulator) | `video/clips/06-*.mp4` (Dash tagged, says Amber, answer Red); `footage/15b`, `15c` |
| 4 | Surges | PASS (emulator) | `shift-config.json` `surgeIndices: [5, 10]`; "SURGE 6" card in `video/clips/01-*.mp4`; `footage/08-surge-two-patients.png` |
| 5 | Four advisors Dash, Sage, Ledger, Orator | PASS | Module 3 lineup in `shift-config.json`; labels in `live-test/live-default.png` |
| 6 | Calibration index, over- and under-reliance, plain-language finding, one next step, trust map | PASS (emulator) | `video/clips/07-*.mp4`: "Calibration index: 100", "Followed wrong advice: 0% · Overruled right advice: n/a", "Dash changed mid-shift on breathing cases, and you noticed", "Next: play another shift…", then the trust map. The panel's title row sits just above the frame in this clip |
| 7 | Pause and resume, table-edge menu | PASS (emulator) | Pause and Menu buttons on the table edge in every clip; `spikes/evidence/T07-paused.png`; STATUS D1 "Pause and resume: Pass". There is no wrist menu (PRD FR-34 asks for one) |
| 8 | High contrast, calm mode, larger text | PASS (emulator) | `video/clips/08-*.mp4` (all three switched on, then a patient in those settings); `spikes/evidence/T12-high-contrast-large.png`. Calm slows arrivals and windows but surges still bring two patients (STATUS FR-52) |
| 9 | Trays shape-coded | PASS | Triangle, diamond and circle trays in `live-test/live-default.png`; `spikes/evidence/T12-greyscale-trays.png` |
| 10 | Ghost-hand tutorial | PASS (emulator) | Ghost hand over the first token in `video/clips/08-*.mp4`; `spikes/evidence/T12-beat1..6`; no fresh person has tried it |
| 11 | Clock freezes when hand tracking drops | PASS (emulator) | `src/game/systems/ShiftSystem.ts:78`; `spikes/evidence/T12-tracking-lost.png`; STATUS D1 checklist. Real tracking loss on a headset never tested |
| 12 | Plane detection with virtual-table fallback after 5 s | UNVERIFIED | `src/scene/config.ts` `planeTimeoutSec: 5`; plane placement in the emulator's synthetic room (`spikes/evidence/T03-plane-placed.png`). Real plane detection and the 5 s timeout path have never run on a headset; desktop takes a separate path (`placed mode=virtual how=desktop`) |
| 13 | Every action possible with one hand | PASS (emulator) | STATUS D1 checklist "one hand"; `footage/12d`; settings text "One hand is enough for everything". Not tried with one real hand |
| 14 | Sound toggle exists, and its default | Toggle PASS; default is **ON** | Toggle in the settings row (`video/clips/08-*.mp4`, "Sound ON"). `src/access/access.ts` "Sound is on unless the player switched it off"; a fresh profile on the live site logs `sound=true`. **FAIL against "keep Sound default OFF"**: changing it is a game-code change, not made |
| 15 | Coach button only when the proxy URL is set, with template fallback | PASS (emulator + live bundle) | `spikes/evidence/T17-01` (URL unset: no button), `T17-13` (real reply), `T17-14`, `T17-15` (fallback); live site logs `[coach] button available` and its bundle contains the Worker URL. The button itself is only drawn on the debrief, which a desktop browser cannot reach |
| 16 | Works with no network after load, except the coach button | UNVERIFIED | The base game makes no request after start (STATUS FR-62; the live page fetched 4 files at load and nothing else). Offline was only simulated inside the page (`T17-04`); true offline makes the emulator relaunch its browser. Whether entering XR on a headset fetches anything more was not checked |
| 17 | Footer "Fictional game logic. Not medical advice." | PASS | `src/scene/ward.ts:211`; visible in `live-test/live-default.png` and every clip |

## 2. Audio

Rendered to `submission/audio/` (details and method in `audio/README.md`):

| File | Cue | Peak |
|---|---|---|
| `01-stamp.wav` | Token committed | -14.5 dBFS |
| `02-advice-arrives.wav` | First advice for a patient | -19.5 dBFS |
| `03-verify.wav` | Second opinion spent | -22.2 dBFS |
| `04-surge.wav` | Surge (never in calm mode) | -18.1 dBFS |
| `05a-result-right.wav` | Reveal, right | -18.1 dBFS |
| `05b-result-wrong.wav` | Reveal, wrong or missed | -21.1 dBFS |

- Gain cap: master gain 0.18 (-14.9 dBFS) on notes of at most 1.0. No limiter: the stamp's two overlapping notes reach 0.188 (-14.5 dBFS), the only cue above the cap.
- Rendered from the recipes in `src/audio/cues.ts` by Chromium's offline Web Audio engine, 48 kHz mono 16-bit.
- **Sound default:** the game ships with Sound on. Not changed (see claim 14).

## 3. Video clips

`submission/video/clips/`, recorded from real play in the emulator on seed `ward-128` (Module 3, every call right, score 172, `[debrief] match=true`, 0 console errors). Clip 08 is a Module 1 start with the settings changed.

| Clip | Shows | Length |
|---|---|---|
| `01-token-placed-advisor-disagrees.mp4` | Surge patient 6: token to Green; Sage: "Cautious call: Amber" | 10.6 s |
| `02-table-and-ward.mp4` | Looking round the room, then the table, advisors, trays and modules | 13.3 s |
| `03-read-commit-advice-keep-reveal.mp4` | Patient 1: poke the card, commit Amber, Dash agrees, Keep, answer Amber | 30.8 s |
| `04-orator-confident-wrong-overruled.mp4` | Patient 3: commit Red; "Orator, very sure: Amber… stake my reputation"; Keep; answer Red | 15.4 s |
| `05-verify-token-clock-jump.mp4` | Patient 4: commit Amber, ask Orator; "Second opinion: 1 token spent, clock +3 s", a pip goes out | 23.2 s |
| `06-update-installed-drifted-advisor-wrong.mp4` | Patient 9: Dash with "update installed" says Amber; Keep Red; answer Red | 16.4 s |
| `07-debrief-index-rates-trust-map.mp4` | Shift review (index 100, rates, finding, next step), then the trust map | 12.3 s |
| `08-trays-contrast-bigtext-calm.mp4` | Settings: Contrast, Big text, Calm on; Module 1 with the ghost-hand tutorial, a token committed | 52.8 s |

- **Method:** Chrome DevTools screencast of the emulator page (Playwright `recordVideo` cannot be used: the emulator owns the browser context). Frames are kept with their real timestamps, then encoded at 30 fps, H.264, no audio.
- **Resolution:** files are 1920×1080, but the emulator draws the headset view at a fixed **800×712**. That view is cropped out, scaled up 1.5× and pillarboxed with dark bars. They are softer than native 1080p.
- **On screen:** only the emulator's 3D view; no browser chrome, address bar, account or personal data. The emulator's own toolbar is cropped out.
- **No sound** in the clips (the screencast carries none); `submission/audio/` has the cues for the edit.
- Scripted hands, not a person. The re-run scripts are in `video/scripts/` (`record-clips.sh`, `record-08.sh`, `encode.mjs`); they need the dev server with `seed: 'ward-128'` set in `src/game/testRun.ts`, which is not committed.
- The capture tool resizes the window, which made three.js log "Can't change size while VR device is presenting" warnings during recording. They come from the recording, not the game.

## 4. Live site, fresh profile

`https://vinay2214-cloud.github.io/second-opinion/`, new headless Chromium (Playwright 1.65) and new context each time (no cache, no storage), 1920×1080. Script: `live-test/live-test.mjs`.

| Check | Default | `?safe=1` |
|---|---|---|
| HTTP | 200 | 200 |
| Load event (two fresh runs each) | 7.8 s, 0.4 s | 1.1 s, 4.2 s |
| Start screen | Shown: table, four advisors, shape trays, "Open this page on the headset and enter XR to play" | Shown, with the safe-mode black label backgrounds |
| Console errors | 0 | 0 |
| Console warnings | 4, all "GPU stall due to ReadPixels" from the headless GPU while screenshotting | same 4 |
| Requests | 4, all 200 (page, `index-*.js`, `world-initializer-*.js`, `scenes/ward.iwsdk.scene.json`), 683 KB | same |
| 404s or failed requests | none | none |
| Requests to the coach Worker | 0 | 0 |
| Coach button | Available: `[coach] button available` logged, Worker URL in the bundle. Drawn only on the debrief, which a desktop browser cannot reach | same |
| Screenshot | `live-test/live-default.png` | `live-test/live-safe.png` |

Load times swing widely between runs: they are GitHub Pages and network time, not the game. Not measured on a headset.

## Files
- `submission/FINAL-CHECKLIST-EVIDENCE.md`
- `submission/audio/`: 6 WAV files, `README.md`, `render-audio.mjs`
- `submission/video/clips/`: 8 MP4 files
- `submission/video/scripts/`: recording and encoding scripts
- `submission/live-test/`: 2 PNG screenshots, `live-test.mjs`
