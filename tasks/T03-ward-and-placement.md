# T03 · Ward scene, table placement and virtual-table fallback

**Agent:** Claude Code · **When:** D1 Tue 10 Nov

**Goal:** A low-poly ward diorama anchored on a detected horizontal plane, or on a virtual table after 5 s.

## Inputs (read first)
- docs/02-game-design.md (section 2)
- docs/03-technical-spec.md (sections 2, 3 S4, 6)
- docs/04-interaction-and-accessibility-spec.md (section 5)
- spikes/S1.md, spikes/S2.md

## Allowed files (edit only these)
- src/index.ts
- src/scene/**
- src/game/systems/PlacementSystem.ts
- iwsdk.config.json
- spikes/S4.md

## Steps
1. Enable plane detection and anchors in World.create. Read XRPlane entities and keep only orientation 'horizontal'.
2. Show a placement highlight. A pinch confirms. Anchor the ward.
3. If no plane is found in 5 s or permission is declined, place a virtual table at about 45 cm in front and 40 cm below eye level and continue. No error screen.
4. Build the ward: floor about 60 x 40 cm, three trays (triangle red, diamond amber, circle green) about 11 cm, advisor rail with four plinths, arrival lane. Flat low-poly, one palette.
5. Add a Re-centre action. Write spikes/S4.md.

## Acceptance (must all pass)
- [ ] Screenshot via MCP shows the ward on the plane or virtual table
- [ ] Fallback reached in under 5.5 s when planes are disabled
- [ ] No console errors for 2 minutes

## Do not
- Do not create planes yourself
- Do not add game rules
- No real-time shadows

## Report format
Screenshots (paths), S4 verdict, anything unconfirmed.

## Paste-ready prompt
```text
Read AGENTS.md, then the files listed under Inputs. Edit only the files listed under Allowed files. If an IWSDK API is not in the docs or the installed type definitions, stop and write spikes/<id>.md instead of guessing. Run the Acceptance commands and paste their output in your report.

Task T03: Ward scene, table placement and virtual-table fallback.
Goal: A low-poly ward diorama anchored on a detected horizontal plane, or on a virtual table after 5 s.
Inputs: docs/02-game-design.md (section 2); docs/03-technical-spec.md (sections 2, 3 S4, 6); docs/04-interaction-and-accessibility-spec.md (section 5); spikes/S1.md, spikes/S2.md.
Allowed files: src/index.ts; src/scene/**; src/game/systems/PlacementSystem.ts; iwsdk.config.json; spikes/S4.md.
Steps:
1. Enable plane detection and anchors in World.create. Read XRPlane entities and keep only orientation 'horizontal'.
2. Show a placement highlight. A pinch confirms. Anchor the ward.
3. If no plane is found in 5 s or permission is declined, place a virtual table at about 45 cm in front and 40 cm below eye level and continue. No error screen.
4. Build the ward: floor about 60 x 40 cm, three trays (triangle red, diamond amber, circle green) about 11 cm, advisor rail with four plinths, arrival lane. Flat low-poly, one palette.
5. Add a Re-centre action. Write spikes/S4.md.
Acceptance: Screenshot via MCP shows the ward on the plane or virtual table | Fallback reached in under 5.5 s when planes are disabled | No console errors for 2 minutes
Do not: Do not create planes yourself | Do not add game rules | No real-time shadows
Report: Screenshots (paths), S4 verdict, anything unconfirmed.
```
