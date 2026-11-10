// Builds the ward, creates its entities and registers the scene-lane components
// and systems. src/index.ts calls this once; later cards extend it here.
import {
  type Entity,
  Vector3,
  PokeInteractable,
  RayInteractable,
  type World,
} from '@iwsdk/core';
import { KeepButton, Token, Tray, VitalsCard } from '../game/components.js';
import { ShiftSystem } from '../game/systems/ShiftSystem.js';
import { PlacementSystem } from '../game/systems/PlacementSystem.js';
import { TokenSystem } from '../game/systems/TokenSystem.js';
import { TraySystem } from '../game/systems/TraySystem.js';
import { PlacementPad, RecentreButton } from './components.js';
import { buildShiftUi } from './shiftUi.js';
import { buildWard, type WardParts } from './ward.js';

export interface WardRuntime {
  parts: WardParts;
  /** Root: moved by placement, anchored in XR. */
  wardEntity: Entity;
  /** Everything visible once placed. Parent for tokens, trays and buttons. */
  contentEntity: Entity;
  padEntity: Entity;
}

export function bootstrapWard(world: World): WardRuntime {
  const parts = buildWard();
  world.registerComponent(PlacementPad).registerComponent(RecentreButton);

  const wardEntity = world.createTransformEntity(parts.root);
  const contentEntity = world.createTransformEntity(parts.content, {
    parent: wardEntity,
  });
  parts.root.add(parts.placementPad);
  const padEntity = world
    .createTransformEntity(parts.placementPad, { parent: wardEntity })
    .addComponent(PlacementPad); // made interactable by PlacementSystem only while shown
  world
    .createTransformEntity(parts.recentreButton, { parent: contentEntity })
    .addComponent(RecentreButton)
    .addComponent(RayInteractable)
    .addComponent(PokeInteractable);

  const runtime: WardRuntime = { parts, wardEntity, contentEntity, padEntity };
  PlacementSystem.ward = runtime;
  world.registerSystem(PlacementSystem);

  // Trays and tokens (T04).
  world.registerComponent(Token).registerComponent(Tray);
  world.registerSystem(TraySystem);
  const traySystem = world.getSystem(TraySystem) as TraySystem;
  for (const tray of parts.trays) {
    world
      .createTransformEntity(tray.root, { parent: contentEntity })
      .addComponent(Tray, { zone: tray.zone })
      .addComponent(RayInteractable); // ray target now; select-to-place arrives with T12
    traySystem.addTray(tray);
  }
  TokenSystem.contentEntity = contentEntity;
  TokenSystem.laneSlots = parts.laneSlots.map(
    (slot) => new Vector3(slot.position.x, slot.position.y + 0.001, slot.position.z),
  );
  world.registerSystem(TokenSystem);

  // Shift furniture and the runtime adapter (T06). Tokens now arrive from the runtime.
  const ui = buildShiftUi();
  world.registerComponent(VitalsCard).registerComponent(KeepButton);
  for (const panel of [ui.speech, ui.debrief]) {
    parts.content.add(panel.mesh);
    world.createTransformEntity(panel.mesh, { parent: contentEntity });
  }
  parts.content.add(ui.card.mesh, ui.keepButton);
  world
    .createTransformEntity(ui.card.mesh, { parent: contentEntity })
    .addComponent(VitalsCard)
    .addComponent(RayInteractable)
    .addComponent(PokeInteractable);
  world
    .createTransformEntity(ui.keepButton, { parent: contentEntity })
    .addComponent(KeepButton)
    .addComponent(RayInteractable)
    .addComponent(PokeInteractable);
  ShiftSystem.ui = ui;
  world.registerSystem(ShiftSystem);
  return runtime;
}
