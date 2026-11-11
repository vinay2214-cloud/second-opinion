# Status (scene lane, Claude Code)

Everything here is **emulator only** (IWSDK emulator, emulated hands). Nothing has been run on a Quest.
Evidence paths are under `spikes/evidence/`. Last update: Wed 11 Nov 2026.

## Where things stand
| Card | Result | Evidence |
|---|---|---|
| T01 scaffold and spikes | Done (tag `d0`) | `spikes/S1.md`, `S2.md`, `S7.md` |
| T03 ward and placement | Done | `T03-*.png`, `spikes/S4.md` |
| T04 token grab and trays | Done | `T04-*.png`, `spikes/S2b.md` |
| T06 Module 1 loop | Done (tag `gate1`) | `T06-*.png` |
| T07 verify, HUD, pause, debrief | Done | `T07-*.png` |
| T08 Module 3, surges, drift | Done | `T08-*.png`, `T08-10-seed-lengths.txt` |
| T12 accessibility and onboarding | Done, see below | `T12-*.png` |
| T09 trust map (Astra's model, my view) | Merged and shown on the debrief | `T09-debrief-review.png`, `T09-trust-map.png` |
| T10 sound | Not started: no audio brief in `proposals/` | `spikes/S6.md` (API works, unheard) |
| T14 polish, debug, safe mode | Done except the items listed below | `T14-*.png` |
| T17 coach button | Blocked: Astra's T15 is not merged | |
| Stage D | Not started | |

## A0 sync
- 10 Nov: `agent/core` had nothing after T05.
- 11 Nov: `agent/core` gained T09 (`fd93d53`) and the debrief copy fix (`be35fcb`). Trial merge on a throwaway branch: 93 tests passed, parity 0 diffs, tsc clean, build OK, core-spec 40/40. Merged into `main` with no conflicts. **T15 (coach) is not on the branch yet**, so Stage C is blocked.
- The debrief now has two views: the review, and a trust map listing each observed advisor and category ("you followed 0 of 2, Dash was right 2"). The Keep button becomes Map / Review on the debrief.

## Gate 2 (11 Nov): green, tagged `gate2`
- Default settings: Module 2, 10 patients, 6 verifies, 20 s pause, hands only, debrief and trust map. Console `{"info":78}`, 0 errors, `[debrief] match=true`.
- Accessibility modes: Module 1 with one hand, calm, high contrast and big text together. 0 errors.
- Module 3: full played shift on the Gate 2 build, 14 patients, 4 verifies, both surges, drift cue at patient 9. Console `{"info":89}`, 0 errors, `[debrief] match=true`, ended at 6:22 shift time.
- Checks: 93 tests, parity 0 diffs, tsc clean, build OK.
- Live URL from a fresh profile: loads with 0 failed requests and 0 console errors. A shift cannot be played there from a desktop browser (no WebXR), so that part of the gate is covered by the local emulator only.
- Cut: gaze-dwell (S5 never run). Not cut but not built: coach button (waiting for T15), Echo (never in scope).
- Content freeze starts now: no new content or interaction types.

## T12 accessibility and onboarding
Acceptance:
- **Full shift with one hand, sound off, calm mode: pass.** Module 1, right hand only (left hand disconnected), calm on, high contrast on, big text on. 6 patients, debrief matched `buildDebrief`, 0 errors. The game has no sound yet, so "sound off" is the only state.
- **Greyscale shows three distinct tray shapes: pass.** `T12-greyscale-trays.png`.
- **Tutorial under 2 min 10 s when scripted: pass.** 27.6 s from the first patient to completion; about 45 s from entering XR.

What shipped:
- **Menu button** (table edge, right) opens a settings row: Contrast, Calm, Big text, Tutorial. Saved through `src/persist` settings and applied live. `T12-settings.png`, `T12-settings-on.png`.
- **High contrast:** black panels with thick white outlines, black floor, white tray outlines; shapes and labels unchanged. `T12-high-contrast-large.png`.
- **Calm:** passes `calm: true` to the runtime. Applies from the next shift (the runtime takes it at creation); a notice says so if toggled mid-shift.
- **Big text:** the speech and debrief panels grow 1.25x about their bottom edge. The vitals card does not grow: there is no room without breaking the 2 cm gaps, and its text is already above the minimum for its distance.
- **One hand:** no separate mode. Every action already works with either single hand, and tracking only needs one hand. The saved `oneHand` setting is not used.
- **Tutorial:** six beats with a ghost hand (poke the card, carry a token, poke Keep), one line at a time. The shift clock waits while the player learns. It plays on Module 1 until finished once; after that the Tutorial toggle turns it back on. `T12-beat1-place.png` to `T12-beat6-reveal.png`.
- **Tracking loss:** no hand seen for 0.8 s freezes the clock and input and shows "Show your hands to continue." Log: `tracking lost remaining=371.36s`, 12 s later `tracking resumed remaining=371.36s`. `T12-tracking-lost.png`.
- **Modules:** all three selectable from the start, "start here" on Module 1. `T12-modules.png`.
- **History and streak:** recorded through `src/game/localDate.ts` (the only `Date` use). The debrief shows the day streak and the number of shifts recorded.
- **Speech panel:** the lead advisor's quote and the latest second opinion's quote both stay on screen. `T12-two-quotes.png`.
- **Drift tag:** now flat on the table between the advisor's name and the trays, clear of the speech panel. `T12-drift-tag.png`.
- **No-leak check:** `T12-token-held-contrast.png` shows only "Make your own call first." while a token is held.

Not shipped in T12:
- **Gaze-dwell:** skipped. Spike S5 was never run, so the precondition is not met.
- **Sound-off setting:** nothing to switch off yet. `src/persist` settings has no mute field; T10 will need one from Astra or a key of its own.

## Stage B: T10 and T14 (11 Nov)
**T10 sound: not built.** There is no audio brief in `proposals/`. The game is silent; every cue is visual. If the brief has not arrived by Sat 14 Nov noon, it ships silent.

**T14 acceptance:**
- Bundle under 15 MB: pass. `dist/` is 3.1 MB of files (largest 2.48 MB, about 0.68 MB gzipped).
- No console errors across 5 full shifts: pass. Module 1, 2, 3, 1, 2 in a row, hands only: 0 errors. One warning (debrief text shrunk to 93%) is fixed by a taller panel.
- `?debug=1` and `?safe=1` on the deployed build: both load with 0 failed requests and 0 console errors (see the live check below). In the emulator both were exercised in a session: `T14-safe-debug-held.png`.
- "It looks clean" from a fresh person: **not done.** Needs a human; ask one person.

**T14 changes:**
- Flat-browser view: dark page background, wider camera, and the line "Open this page on the headset and enter XR to play." `T14-flat-view.png`.
- `?debug=1`: in-world panel left of the speech panel with frame rate, worst frame time, session and hand tracking state, last error and build tag.
- `?safe=1`: every material opaque; highlight rings switch on and off instead of fading; labels sit on black boxes.
- Token window ring is now one draw call per token (was 24) and still dashed in the last 8 s. Blob shadow under tokens.
- Commit snap overshoots slightly before the stamp.
- Canvas textures capped at 1024 px per side.
- Idle screens redraw four times a second instead of every frame.
- Test aids: `?speed=` and `src/game/testRun.ts` are read only in dev builds; the production bundle contains neither string (`grep -c TEST_RUN dist/assets/index-*.js` gives 0). `?seed=` and `?module=`... only `?seed=` works on the live site, by design.

**T14 not done:**
- Ward overhang: unchanged. On the emulator's round desk the ward's front corners overhang. Fixing it means pushing the ward 10 cm further away, which breaks the 60 cm reach. A rectangular table fits.
- Instancing of tokens and trays: not done; object counts are small (at most 3 tokens, 3 trays).
- Frame rate on device: cannot be measured in the emulator. The debug overlay exists so the Quest tester can report it.
- Button labels ("Pause", "Keep", "Menu", "Centre") have capitals of about 1 cm, under the 1.2 cm rule.

## Open issues
- The drift tag is small (capitals about 1.05 cm) and its second row is slightly clipped by the tray edge. It is meant to be easy to miss, but check it on a headset.
- The ghost hand is a simple blocky shape and can be hard to read against the card.
- Button labels "RE-CENTRE", "Pause", "Keep", "Menu" are below the 1.2 cm text rule (T14).
- The live site cannot be played in a plain desktop browser (no WebXR there), so "fresh profile" checks on the live URL cover loading and console errors only. Full shifts are verified in the local emulator.
- For the remote Quest tester: poke accuracy on 4.5 cm buttons; accidental card pokes when reaching for the lane; speech text legibility at about 65 cm; whether the tracking-loss freeze triggers when hands rest in the lap.

## Next
Gate 2 check, then T14 (T10 only if the audio brief arrives).
