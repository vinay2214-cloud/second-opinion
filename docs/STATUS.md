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
| T14, T17, Stage D | Not started | |

## A0 sync
- 10 Nov: `agent/core` had nothing after T05.
- 11 Nov: `agent/core` gained T09 (`fd93d53`) and the debrief copy fix (`be35fcb`). Trial merge on a throwaway branch: 93 tests passed, parity 0 diffs, tsc clean, build OK, core-spec 40/40. Merged into `main` with no conflicts. **T15 (coach) is not on the branch yet**, so Stage C is blocked.
- The debrief now has two views: the review, and a trust map listing each observed advisor and category ("you followed 0 of 2, Dash was right 2"). The Keep button becomes Map / Review on the debrief.

## Gate 2 (11 Nov): green, tagged `gate2`
- Default settings: Module 2, 10 patients, 6 verifies, 20 s pause, hands only, debrief and trust map. Console `{"info":78}`, 0 errors, `[debrief] match=true`.
- Accessibility modes: Module 1 with one hand, calm, high contrast and big text together. 0 errors.
- Module 3 full shift: last full played run was at T08 (before T12). Since T12 I only ran its first patient with three second opinions and two fast idle runs.
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

## Open issues
- The drift tag is small (capitals about 1.05 cm) and its second row is slightly clipped by the tray edge. It is meant to be easy to miss, but check it on a headset.
- The ghost hand is a simple blocky shape and can be hard to read against the card.
- Button labels "RE-CENTRE", "Pause", "Keep", "Menu" are below the 1.2 cm text rule (T14).
- The live site cannot be played in a plain desktop browser (no WebXR there), so "fresh profile" checks on the live URL cover loading and console errors only. Full shifts are verified in the local emulator.
- For the remote Quest tester: poke accuracy on 4.5 cm buttons; accidental card pokes when reaching for the lane; speech text legibility at about 65 cm; whether the tracking-loss freeze triggers when hands rest in the lap.

## Next
Gate 2 check, then T14 (T10 only if the audio brief arrives).
