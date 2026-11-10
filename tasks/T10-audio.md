# T10 · Audio brief and sound implementation

**Agent:** Gemini 4 Argon (brief), then Claude Code (implement) · **When:** D3 brief, D4 to D6 implement

**Goal:** A cohesive set of short original sounds, each with a visual twin, plus the code that plays them after a user gesture.

## Inputs (read first)
- docs/02-game-design.md (section 12)
- docs/04-interaction-and-accessibility-spec.md (section 2)
- spikes/S6.md

## Allowed files (edit only these)
- proposals/audio-brief.md (Argon)
- src/audio/** and public/audio/** (Claude Code)
- CREDITS.md

## Steps
1. Argon: write the audio brief: for each event in the feedback table a one-line description, duration, pitch character, and a synthesis recipe (Web Audio oscillators and envelopes) so no external files are required.
2. Claude Code: implement a small Web Audio synth or load tiny files. Start audio after the first user gesture (S6). Spatialise the stamp and advisor motifs at their positions if S6 passes.
3. Add a master volume and a mute that also forces every visual twin on.
4. List any external asset and licence in CREDITS.md.

## Acceptance (must all pass)
- [ ] Every row in the feedback table has a sound and a visual twin
- [ ] Mute test: a shift plays with sound off
- [ ] Total audio payload under 1.5 MB

## Do not
- No copyrighted music or samples
- Do not autoplay before a gesture

## Report format
List of sounds and where they fire.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T10: Audio brief and sound implementation.
Goal: A cohesive set of short original sounds, each with a visual twin, plus the code that plays them after a user gesture.
Inputs: docs/02-game-design.md (section 12); docs/04-interaction-and-accessibility-spec.md (section 2); spikes/S6.md.
Allowed files: proposals/audio-brief.md (Argon); src/audio/** and public/audio/** (Claude Code); CREDITS.md.
Steps:
1. Argon: write the audio brief: for each event in the feedback table a one-line description, duration, pitch character, and a synthesis recipe (Web Audio oscillators and envelopes) so no external files are required.
2. Claude Code: implement a small Web Audio synth or load tiny files. Start audio after the first user gesture (S6). Spatialise the stamp and advisor motifs at their positions if S6 passes.
3. Add a master volume and a mute that also forces every visual twin on.
4. List any external asset and licence in CREDITS.md.
Acceptance: Every row in the feedback table has a sound and a visual twin | Mute test: a shift plays with sound off | Total audio payload under 1.5 MB
Do not: No copyrighted music or samples | Do not autoplay before a gesture
Report: List of sounds and where they fire.
```
