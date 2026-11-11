# Audio brief (T10)

Written by Claude Code on 11 Nov 2026 (the audio brief was Argon's card; Argon is no longer used). It is a proposal until the owner accepts it. It replaces the longer cue list in `docs/04` section 2 with five cues, to fit the time left.

## Rules
- **Five short cues**, all synthesised at run time with the Web Audio API (oscillators and gain envelopes). No audio files, no samples, no external assets, nothing to credit.
- **Quiet.** One master gain of 0.18 (about -15 dB). No cue is longer than 0.4 s. No music, no ambient hum, no looping sound.
- **Every cue has a visual twin that already exists.** Sound never carries information on its own; the game plays the same with sound off.
- **Sound-off toggle** in the settings menu (Menu button), saved locally, on by default.
- **Calm mode: no surge sound.** The other four cues still play in calm mode.
- Sound starts only after a user gesture (entering XR). If the audio context is not running, the cue is skipped silently; nothing waits for it.
- Not spatialised. All cues play centred. (S6 found the positional one-shot helper ignores position in this IWSDK version; five quiet centred cues do not need it.)

## Cues
| # | Cue | Fires when | Existing visual twin | Length | Character |
|---|---|---|---|---|---|
| 1 | Stamp | The runtime accepts a commit (token released over a tray) | Token snaps with a small overshoot, tray ring pulse | 0.14 s | Low, soft thump with a tiny click on top |
| 2 | Advice arrives | The lead advisor's line appears (after the 0.6 s hold), once per patient | Advisor plinth lights, call and quote appear on the speech panel | 0.24 s | Two soft rising notes |
| 3 | Verify | A second opinion is granted | One pip empties, "1 token spent, clock +3 s" line, second plinth lights | 0.18 s | Light coin-like double click |
| 4 | Surge | A surge patient arrives. **Not in calm mode** | "SURGE" on the vitals card, shorter window ring, second token on the lane | 0.36 s | Soft double chime, same note twice |
| 5 | Result | A patient resolves. Two variants: final call right, or wrong or missed | Truth tray glows, "Answer" line with shape and word, score for the patient | 0.30 s | Right: two notes rising. Wrong: two notes falling, softer, never harsh |

## Synthesis recipes
Each note is one oscillator into one gain node into the master gain. Envelope for every note: gain rises linearly from 0 to its peak in 8 ms, then falls exponentially to silence by the end of the note. Frequencies in Hz; a note with two frequencies glides exponentially from the first to the second over its length. "Start" is seconds after the cue fires. Peak is relative to the master gain.

| Cue | Note | Wave | Frequency | Start | Length | Peak |
|---|---|---|---|---|---|---|
| Stamp | thump | sine | 170 to 85 | 0 | 0.14 | 1.0 |
| Stamp | click | triangle | 1100 | 0 | 0.03 | 0.25 |
| Advice | first | sine | 587 (D5) | 0 | 0.10 | 0.6 |
| Advice | second | sine | 784 (G5) | 0.09 | 0.15 | 0.6 |
| Verify | first | triangle | 1319 (E6) | 0 | 0.05 | 0.45 |
| Verify | second | triangle | 1760 (A6) | 0.06 | 0.12 | 0.45 |
| Surge | first | sine | 523 (C5) | 0 | 0.16 | 0.7 |
| Surge | second | sine | 523 (C5) | 0.20 | 0.16 | 0.7 |
| Result, right | first | sine | 523 (C5) | 0 | 0.12 | 0.7 |
| Result, right | second | sine | 784 (G5) | 0.11 | 0.19 | 0.7 |
| Result, wrong | first | sine | 392 (G4) | 0 | 0.12 | 0.5 |
| Result, wrong | second | sine | 294 (D4) | 0.11 | 0.19 | 0.5 |

## Left out on purpose
Token hover and pickup ticks, one motif per advisor, the last-8-seconds tick, the drift chime and the ambient hum from `docs/02` section 12 and `docs/04` section 2. Their visual cues stay. The drift cue stays silent, which keeps it easy to miss by design.

## Acceptance
- A full shift with sound on logs each cue once per event and no console errors.
- A full shift with sound off plays the same and logs no cue.
- Calm mode: no surge cue.
- Audio payload: 0 bytes of files.
- If this is not stable in the emulator by Fri 13 Nov evening, the game ships silent and `docs/STATUS.md` says so.

## Cannot be checked in the emulator
The emulator's browser is headless: nobody has heard these sounds. Loudness, tone and timing against the visuals need one listen on a headset or a desktop browser by a person.
