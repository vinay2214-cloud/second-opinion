# 03 · Technical specification

**Stack:** Immersive Web SDK (IWSDK) 1.0 · TypeScript · Three.js · Vite · WebXR · GitHub Pages
**Principle:** *a pure, tested game runtime with thin ECS adapters.* Rendering and input never contain game rules.

## 1. Architecture

```
┌─────────────────────────── Player (hands, optional gaze) ───────────────────────────┐
│                                                                                     │
│  IWSDK input: OneHandGrabbable · PokeInteractable · RayInteractable · Hovered/Pressed│
└──────────────┬──────────────────────────────────────────────────────────────────────┘
               │ intents: commit(zone) · verify(advisor) · finalize(zone) · pause
┌──────────────▼───────────────── ECS adapters (src/game) ────────────────────────────┐
│ PlacementSystem  TokenSystem  TraySystem  VerifySystem  HudSystem  DebriefSystem     │
│ (translate input to intents, and runtime events to visuals, audio, UI)              │
└──────────────┬──────────────────────────────────────────────────────────────────────┘
               │ calls                                   ▲ events + publicView()
┌──────────────▼───────────── Game core (src/core, PURE TS, no three/iwsdk) ──────────┐
│ createShiftRuntime · buildShift · advise · classifyReliance · calibrationIndex ·     │
│ outcomeScore · buildDebrief · trustMap · dailySeed                                   │
└──────────────┬──────────────────────────────────────────────────────────────────────┘
               │ reads
┌──────────────▼──────────── Static data (bundled JSON) ──────────────────────────────┐
│ cases.seed.json · advisors.json · shift-config.json · triage-rubric.json · lines     │
└─────────────────────────────────────────────────────────────────────────────────────┘
   Optional: serverless proxy → LLM for the Calibration Coach "ask why"
             (3 s timeout, template fallback)
   Local only: safe storage wrapper for settings, streak, history
```

### Why this split

- Agents can build the core, the scene and the UI **in parallel** with no merge conflicts.
- The core is **deterministic**, so the 40 golden tests in `core-spec/` stay valid after the port.
- The UI can only render `publicView()`, so advice or truth **cannot leak** before the right moment.

## 2. What the IWSDK docs actually confirm

Read on 9 Nov 2026 from Meta's IWSDK documentation. Names are exactly as documented. **Re-verify against the installed version** (the `@iwsdk/reference` MCP server and `npx iwsdk mcp inspect` are the fastest checks).

| Area | Confirmed | Source |
|---|---|---|
| Create | `npm create @iwsdk@latest`. Node 20.19 or newer per the competition page | Competition requirements |
| ECS | `createComponent('Name', { field: { type: Types.Float32, default } })`, `createSystem(queries, config)` with `update(delta)`, `init()`, `this.queries.<name>.entities`, `this.config.<field>.peek()`, `world.registerComponent`, `world.registerSystem`, `world.createTransformEntity(object3D)`, `entity.addComponent`, `getValue`, `setValue`, query `subscribe('qualify', fn)` | ECS concepts guide |
| World | `World.create(container, { xr: { sessionMode, features }, features: { grabbing, locomotion }, level })` | ECS concepts, scene understanding guide |
| Grab | `OneHandGrabbable` (options include `rotate`, `translate`), `TwoHandsGrabbable`, `DistanceGrabbable`, enabled by `features: { grabbing: true }`. `RayInteractable` is a tag for ray selection | Grabbing concepts, built-in interactions guide |
| Poke | `PokeInteractable` exists for near touch. **Options and events are not documented in the pages I read** | Built-in interactions guide |
| Input state | `InputSystem` adds transient **`Hovered`** and **`Pressed`** tags. **Gaze targeting drives the same tags**, so no gaze-specific handler is needed | Built-in interactions guide |
| Scene understanding | `SceneUnderstandingSystem`, `XRPlane` (read `_plane.orientation === 'horizontal'`), `XRMesh` (`semanticLabel`, `isBounded3D`, `dimensions`), `XRAnchor`. Enable with `xr: { sessionMode: SessionMode.ImmersiveAR, features: { planeDetection: true, meshDetection: true, anchors: true } }`. Do not create planes yourself | Scene understanding guide |
| Caveats | The room scan must be completed on the device. Detection depends on clear, well-lit surfaces. Limit scene-understanding entities. Not all WebXR runtimes support all features | Scene understanding guide |
| Project | Settings live in `iwsdk.config.json`. Vite plugin `iwsdkDev()` from `@iwsdk/vite-plugin-dev`. App code uses `virtual:iwsdk-project` | AI getting started |
| AI tooling | `npx iwsdk dev up --ai-mode agent` (headless) or `--ai-mode collaborate` (headed), add `--foreground`. `npx iwsdk dev status`, `npx iwsdk adapter sync --tools claude,codex`, `npx iwsdk mcp inspect`. Generates `AGENTS.md`, a `CLAUDE.md` shim, `.mcp.json`, `.agents/skills/`. 45 tools at v0.5.3 covering screenshots, console logs, ECS inspection, scene and input simulation | AI-assisted dev tooling, AI getting started |
| Build | `npm run build` outputs `dist/`. For a GitHub project site set Vite `base: '/<repo-name>/'`. Deploy by manual `gh-pages` branch or a GitHub Actions workflow (Node 20) | Build and deploy guide |
| Known gotcha | A blank screen on GitHub Pages was traced to a wrong repo or base path. Use the repo name in `base`, and Pages source = GitHub Actions | Meta developer forum |
| Gemini | Gemini CLI is **not** covered by IWSDK's adapter docs. For other MCP clients run `npx iwsdk adapter prompt` | AI getting started |

### Not documented in the pages I read (each becomes a Day-0 spike)

1. How to detect **grab end / release** over a tray (the grabbing page lists no callbacks).
2. `PokeInteractable` options and any press/release signal.
3. The exact flags that enable **gaze** and how to read dwell.
4. Spatial audio API names and the user-gesture start requirement.
5. UIKit / UIKitML component names for panels.
6. System lifecycle hooks beyond `init`, `update`, and query `qualify`.

## 3. Day-0 spikes (run these first, each ≤ 90 minutes, each writes `spikes/Sx.md`)

| ID | Question | Pass | Fallbacks |
|---|---|---|---|
| **S1** | Does the scaffold run with the emulator and the AI tooling? | `npx iwsdk dev up` runs, MCP reports `commandReady`, a screenshot tool works | Re-read `AGENTS.md`, run `npx iwsdk adapter status` |
| **S2** | How do we know when a grabbed token is released and where? | A system logs "released over tray X" reliably in the emulator | (a) read the Pointers and Distance-grabbing docs via `@iwsdk/reference`; (b) detect the end of `Pressed` via the query's removal event; (c) own drag: on `Pressed` follow the pointer ray, on release compute nearest tray |
| **S3** | Poke on a spatial panel: press and release signals? | Poking a button fires an action once | Use `RayInteractable` plus `Pressed` as the poke fallback; or colliders and fingertip distance |
| **S4** | Plane detection in the emulator and on device | `XRPlane` with `orientation === 'horizontal'` found, ward placed. 5 s timeout falls back to a virtual table | Virtual table only (still passes the rules) |
| **S5** | Gaze hover and dwell | Gaze hover sets `Hovered`. A 1.2 s dwell fires one action | Drop gaze-dwell from MUST to COULD |
| **S6** | Spatial audio after a user gesture | A stamp sound plays from the tray position | Plain Web Audio |
| **S7** | GitHub Pages deploy | A hello page loads in a **fresh browser profile** under the repo path | Fix `base`, set Pages source to Actions, use `ci/deploy.yml` |
| **S8** | On-device (or Immersive Web Emulator) run | Hands visible, no console errors, FPS readable | Emulator-only, see risk R3 |

## 4. Project layout (target)

```
second-opinion/
  AGENTS.md              (IWSDK-generated) + append AGENTS.project.md
  CLAUDE.md              (IWSDK shim that imports AGENTS.md)
  iwsdk.config.json  vite.config.ts  package.json
  .github/workflows/deploy.yml     (from ci/deploy.yml)
  public/audio/  public/models/
  data/                  copy from the kit, single source of truth for tuning
  schemas/  docs/  tasks/  spikes/
  src/
    index.ts             World.create, register components and systems
    core/                PURE TS port of core-spec (owner: core agent). No three or iwsdk imports
    game/
      components.ts      Token, Tray, AdvisorBadge, VerifyButton, KeepButton, HudPanel
      systems/           Placement, Token, Tray, Verify, Hud, Debrief, Pause, Dwell
      runtime.ts         wires createShiftRuntime to the ECS
    scene/               low-poly factories: ward, trays, tokens, advisors
    ui/                  vitals card, HUD, debrief, trust map, wrist menu
    access/              dwell, one-hand, high contrast, calm, settings
    audio/
    persist/             safe storage wrapper (try/catch + in-memory)
  tests/                 Vitest: core golden tests (ported from core-spec/test)
  core-spec/             reference JS implementation and tests (keep until the port is green)
```

## 5. Runtime contract (from `core-spec/src/shift-runtime.js`)

| Method | When | Returns |
|---|---|---|
| `start(nowMs)` / `tick(nowMs)` | Every frame (cheap) | Events: `arrive`, `resolved` (timeouts, auto-keep), `shiftEnd` |
| `commit(i, zone, nowMs)` | Token released over a tray | `{ ok, lead: {advisorId, call, line, statedConfidence} }` |
| `verify(i, advisorId, nowMs)` | Advisor poked | `{ ok, advice, tokens }`, spends a token and 3 s |
| `finalize(i, zone, nowMs)` | Keep pressed, or token moved to another tray | `{ ok, result: {truth, whyLine, delta, reliance} }` |
| `publicView(i)` | Rendering | Only data the player may see (no advice before commit, no truth before resolve) |
| `availableVerifiers(i)`, `tokens`, `driftCue()`, `remainingSec()` | HUD | HUD data |
| `summary()` | After `shiftEnd` | Entries, score, debrief (index, rates, findings, next step) |

**Rules for adapters:**

1. Systems call the runtime. They never compute scores, advice or reliance themselves.
2. The UI renders `publicView()` only.
3. Time comes from `performance.now()` passed in. Never use `Date` inside the core.
4. Pause by not calling `tick` (and shifting `start`'s reference).

## 6. ECS mapping (proposed, adjust names after spikes)

| Component | Fields | Purpose |
|---|---|---|
| `Token` | `index`, `state` | A patient token entity |
| `Tray` | `zone` | A Red / Amber / Green tray with shape |
| `AdvisorBadge` | `advisorId`, `driftCue` | Advisor plinth, pokeable |
| `KeepButton` | none | Confirms the call |

| System | Reads | Writes |
|---|---|---|
| `PlacementSystem` | `XRPlane` | Ward anchor (plane or virtual table) |
| `TokenSystem` | grab state, runtime events | token spawn, snap, runtime `commit` / `finalize` |
| `VerifySystem` | poke on advisors | runtime `verify`, reveal advice |
| `HudSystem` | runtime `tick`, `publicView` | clock, tokens, score, drift cue |
| `DebriefSystem` | runtime `summary()` | debrief panel, trust map |
| `DwellSystem` | `Hovered` tag | synthesises a select after dwell (access) |

## 7. UI approach

Primary: IWSDK **UIKit / UIKitML** for panels (vitals card, HUD, debrief). Spike it on Day 1. **Fallback:** `CanvasTexture` planes drawn with the 2D canvas API, with `RayInteractable` / `PokeInteractable` colliders. Either way keep text ≥ 1.2 cm tall at 50 cm, short lines, high contrast.

## 8. Performance budget

| Item | Budget |
|---|---|
| Frame rate | ≥ 60 fps (rules). Verify on device, the emulator cannot confirm it |
| Draw calls | Low hundreds. Instance tokens and trays |
| Shadows | No real-time shadows. Use baked blobs |
| Textures | ≤ 1024 px, compressed where possible |
| Total assets | ≤ 15 MB, bundle gzip small |
| Per-frame work | No allocations in `update`, no AI calls, no JSON parse |

## 9. Persistence

`localStorage` only via `src/persist/safeStorage.ts`: try/catch every read and write, fall back to memory. Keys: `so.settings`, `so.history`, `so.tutorialDone`. Never required for correctness.

## 10. Optional AI Coach (stretch)

Proxy: a serverless function holding the API key (never in the client). Request: the **facts** from `summary().debrief` (index, rates, findings), nothing else. Response: 2 to 3 sentences. Client timeout 3 s, then show template lines from `debrief-lines.json`. No raw player data, no identifiers. The game must be identical with the coach off.

## 11. Deploy

1. `vite.config.ts`: `base: '/<repo-name>/'` (a user site at the root uses `/`).
2. Copy `ci/deploy.yml` to `.github/workflows/deploy.yml`. Settings → Pages → Source: GitHub Actions.
3. Push to `main`. Open the Pages URL in a **fresh profile**. Check no 404 for assets.
4. Final week: pin the build (tag `submission-1`). After submitting, **stop deploying**.

## 12. Dev workflow commands

```bash
npm create @iwsdk@latest          # name: second-opinion (follow prompts, choose AR/mixed reality if asked)
cd second-opinion && npm install
npx iwsdk adapter sync --tools claude,codex   # writes .mcp.json, .codex/config.toml, AGENTS.md if absent
npx iwsdk dev up --ai-mode agent --foreground # headless dev server and managed browser for agents
npx iwsdk dev status                          # wait for browserCommandReady
npx iwsdk mcp inspect                         # list MCP tools
npm test                                      # core golden tests
node core-spec/tools/validate-cases.js        # case pool validity
node core-spec/tools/simulate-balance.js      # balance gate
npm run build                                 # outputs dist/
```

## 13. Known unknowns (tracked in `10-risks-and-decisions.md`)

Grab release signal · Poke events · Gaze/dwell flags · Audio API · UIKit specifics · true FPS on device · Plane detection UX on a real table · exact CLI prompts of the generator.
