# S2b · Can one token be both pinch-grabbable and ray-grabbable? (found during T04)
Verdict: FAIL for "both on one entity". Near pinch-grab works; the ray alternative is deferred.
Date / IWSDK version / device or emulator: Tue 10 Nov 2026 / @iwsdk/core 1.1.0-rc.2 / IWER emulator (metaQuest3), emulated hands.

What I tried (in order):
1. Read the installed typings. `grab/one-hand-grabbable.d.ts` and `grab/distance-grabbable.d.ts` both say: "Grab components are mutually exclusive per entity. Choose exactly one of OneHandGrabbable, TwoHandsGrabbable, or DistanceGrabbable". So `OneHandGrabbable` + `DistanceGrabbable` on one token is not supported.
2. `OneHandGrabbable` + `RayInteractable` on the token, to get a ray "select the token, then select a tray" path and a ray hover. The SDK's grab system marks one-hand grabbables as closed to rays (`pointerEventsType = { deny: 'ray' }` in `grab-system.js`), so the token never receives `Hovered` or `Pressed` from a ray. I removed that code path instead of shipping something that cannot fire.

What worked (code snippet or path): `OneHandGrabbable { rotate: false, translate: true }` alone, in `src/game/systems/TokenSystem.ts`. Hover feedback uses the documented `this.player.gripSpaces.left/right`: a hand within 12 cm lights the token's outline.

Evidence (command output, screenshot path): six scripted carries in a row, alternating hands, each followed by an ECS read of the token:
```
hand-left  -> Tray GREEN: state tray, zone green      [intent] {"type":"place","tokenId":0,"zone":"green"}
hand-right -> Tray RED:   state tray, zone red        [intent] {"type":"place","tokenId":0,"zone":"red"}
hand-left  -> Tray AMBER: state tray, zone amber      [intent] {"type":"place","tokenId":0,"zone":"amber"}
hand-right -> Tray GREEN: state tray, zone green      [intent] {"type":"place","tokenId":0,"zone":"green"}
hand-left  -> Tray RED:   state tray, zone red        [intent] {"type":"place","tokenId":0,"zone":"red"}
hand-right -> Tray AMBER: state tray, zone amber      [intent] {"type":"place","tokenId":0,"zone":"amber"}
[token] 0 released outside trays, back to lane        (released 16 cm above the table edge)
```
Screenshots: `spikes/evidence/T04-token-held.png`, `T04-stamp.png`, `T04-snapped-red.png`.

Fallback chosen (if any): for the ray and gaze alternative in `docs/04` section 1 ("gaze-dwell on token then on tray"), use a separate ray target that stands for the waiting token (for example the lane slot under it) and the trays, which are already `RayInteractable`. That belongs to T12. Needs your OK because it changes how the alternative is built, not what the player does.

Impact on docs or tasks:
- T04 step 1 ("also ray-grabbable") is not delivered. The primary hands path is.
- Two things that cost time and are worth knowing for T06:
  1. Never hide or disable a target while a hand is still pressing it. Confirming placement on pinch *start* hid the pad mid-press and left that hand unable to grab anything afterwards. Placement and Re-centre now act on pinch *release* (`Pressed` disqualify).
  2. `iwsdk xr list-targets` can return stale positions after an object is moved by code. Read the entity with `iwsdk ecs query` instead.
- One unexplained miss: a left-hand grab did nothing once while the right hand was parked about 15 cm above the ward. It did not recur in the six-carry batch with the idle hand parked away. Not root-caused.
