# Sound cues, rendered

The game's five cues (the result cue has a right and a wrong version), rendered to WAV so a person can listen without a headset. Nobody had heard them before these files existed.

| File | Plays when | Sound | Length | Peak |
|---|---|---|---|---|
| `01-stamp.wav` | A token is committed to a tray | Low thud gliding 170 to 85 Hz with a short click | 0.27 s | -14.5 dBFS |
| `02-advice-arrives.wav` | The first advice for a patient appears | Two soft rising notes (D5, G5) | 0.37 s | -19.5 dBFS |
| `03-verify.wav` | A second opinion (verify token) is spent | Two quick high ticks (E6, A6) | 0.31 s | -22.2 dBFS |
| `04-surge.wav` | A surge brings two patients (never in calm mode) | Two repeated C5 notes | 0.49 s | -18.1 dBFS |
| `05a-result-right.wav` | The reveal, when the kept call was right | Rising C5 to G5 | 0.43 s | -18.1 dBFS |
| `05b-result-wrong.wav` | The reveal, when the kept call was wrong or missed | Falling G4 to D4 | 0.43 s | -21.1 dBFS |

Each cue has a visual twin (stamp flash, advice text, "Second opinion: 1 token spent, clock +3", surge rings, the answer panel); nothing depends on hearing them.

## How these were made
- The note recipes, the master gain (0.18), the 8 ms attack and the envelope were read from `src/audio/cues.ts` (not retyped) and scheduled the same way `playCue` does.
- Rendered by Chromium's own Web Audio engine (Playwright 1.65, `OfflineAudioContext`), 48 kHz, mono, 16-bit PCM. On a Quest the browser's engine may sound slightly different.
- No files are shipped with the game: it synthesises these live. The WAVs are for listening and for the video.

## Levels
- Gain cap: every note is at most 1.0 before a master gain of 0.18 (-14.9 dBFS). There is no limiter, so notes that overlap can sum above that: the stamp's thud and click together peak at 0.188 (-14.5 dBFS). All other cues stay below the cap.
- Loudest cue: stamp, -14.5 dBFS peak. Quietest: verify, -22.2 dBFS peak.

## Default
The game ships with Sound **on** (`src/access/access.ts`: "Sound is on unless the player switched it off"; a fresh profile on the live site logs `sound=true`). The Sound toggle in the settings menu turns it off and the choice is remembered.
