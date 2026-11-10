# T04 · Token grab, release and tray snap

**Agent:** Claude Code · **When:** D1 Tue 10 Nov

**Goal:** Patient tokens can be grabbed with pinch (or ray) and released over a tray, producing a clean intent {tokenId, zone}.

## Inputs (read first)
- spikes/S2.md
- docs/02-game-design.md (sections 2, 3)
- docs/04-interaction-and-accessibility-spec.md (sections 1, 2, 3)

## Allowed files (edit only these)
- src/game/components.ts
- src/game/systems/TokenSystem.ts
- src/game/systems/TraySystem.ts
- src/scene/**

## Steps
1. Create Token and Tray components. Make tokens OneHandGrabbable (translate only) and also ray-grabbable.
2. Use the release method proven in S2 to detect release over a tray. Snap to the tray centre with a small overshoot.
3. Emit a typed intent. Do not compute any score or rule.
4. Add hover and pickup feedback (outline pulse, trays highlight). No advice anywhere on screen while held.

## Acceptance (must all pass)
- [ ] Scripted input via MCP: pick up token, release over each tray, intent logged with the right zone
- [ ] Release outside any tray returns the token to the lane
- [ ] No console errors

## Do not
- Do not call the runtime yet (T06 does)
- No game rules in systems

## Report format
Intent log excerpt, screenshot, known issues.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T04: Token grab, release and tray snap.
Goal: Patient tokens can be grabbed with pinch (or ray) and released over a tray, producing a clean intent {tokenId, zone}.
Inputs: spikes/S2.md; docs/02-game-design.md (sections 2, 3); docs/04-interaction-and-accessibility-spec.md (sections 1, 2, 3).
Allowed files: src/game/components.ts; src/game/systems/TokenSystem.ts; src/game/systems/TraySystem.ts; src/scene/**.
Steps:
1. Create Token and Tray components. Make tokens OneHandGrabbable (translate only) and also ray-grabbable.
2. Use the release method proven in S2 to detect release over a tray. Snap to the tray centre with a small overshoot.
3. Emit a typed intent. Do not compute any score or rule.
4. Add hover and pickup feedback (outline pulse, trays highlight). No advice anywhere on screen while held.
Acceptance: Scripted input via MCP: pick up token, release over each tray, intent logged with the right zone | Release outside any tray returns the token to the lane | No console errors
Do not: Do not call the runtime yet (T06 does) | No game rules in systems
Report: Intent log excerpt, screenshot, known issues.
```
