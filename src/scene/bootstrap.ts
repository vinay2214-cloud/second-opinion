// Builds the ward, creates its entities and registers the scene-lane components
// and systems. src/index.ts calls this once; later cards extend it here.
import {
  type Entity,
  Vector3,
  PokeInteractable,
  RayInteractable,
  type World,
} from '@iwsdk/core';
import { Token, Tray } from '../game/components.js';
import { PlacementSystem } from '../game/systems/PlacementSystem.js';
import { TokenSystem } from '../game/systems/TokenSystem.js';
import { TraySystem } from '../game/systems/TraySystem.js';
import { PlacementPad, RecentreButton } from './components.js';
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
  TokenSystem.laneRest = new Vector3(
    parts.laneSlot.position.x,
    parts.laneSlot.position.y + 0.001,
    parts.laneSlot.position.z,
  );
  world.registerSystem(TokenSystem);
  // One token so the grab loop can be exercised. T06 replaces this with runtime arrivals.
  (world.getSystem(TokenSystem) as TokenSystem).spawnToken(0);
  return runtime;
}
