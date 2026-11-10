// Builds the ward, creates its entities and registers the scene-lane components
// and systems. src/index.ts calls this once; later cards extend it here.
import {
  type Entity,
  PokeInteractable,
  RayInteractable,
  type World,
} from '@iwsdk/core';
import { PlacementSystem } from '../game/systems/PlacementSystem.js';
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
    .addComponent(PlacementPad)
    .addComponent(RayInteractable)
    .addComponent(PokeInteractable);
  world
    .createTransformEntity(parts.recentreButton, { parent: contentEntity })
    .addComponent(RecentreButton)
    .addComponent(RayInteractable)
    .addComponent(PokeInteractable);

  const runtime: WardRuntime = { parts, wardEntity, contentEntity, padEntity };
  PlacementSystem.ward = runtime;
  world.registerSystem(PlacementSystem);
  return runtime;
}
