// Patient tokens: pinch-grab, release over a tray, snap, return to the lane.
// Emits a typed TokenIntent. Never calls the runtime and never applies a rule
// (T06 wires intents to runtime.commit / finalize).
import {
  createSystem,
  type Entity,
  Grabbed,
  OneHandGrabbable,
  Vector3,
} from '@iwsdk/core';
import type { Zone } from '../../scene/config.js';
import { buildToken, type TokenParts } from '../../scene/token.js';
import { Token, type TokenIntent } from '../components.js';
import { TraySystem } from './TraySystem.js';

const SNAP_SEC = 0.11;
const SQUASH_SEC = 0.14;
const RETURN_SEC = 0.22;
/** A hand this close to a waiting token lights its outline ("near" feedback). */
const NEAR_M = 0.12;

interface TokenView {
  parts: TokenParts;
  from: Vector3;
  to: Vector3;
  moveLeft: number; // seconds left of the move, 0 = not moving
  moveTotal: number;
  squashLeft: number;
  stampZone: Zone | '';
}

type IntentListener = (intent: TokenIntent) => void;

export class TokenSystem extends createSystem({
  tokens: { required: [Token] },
  held: { required: [Token, Grabbed] },
}) {
  /** Set by bootstrap before registration. */
  static contentEntity: Entity;
  static laneRest: Vector3;

  private views = new Map<Entity, TokenView>();
  private listeners = new Set<IntentListener>();
  private trays!: TraySystem;
  private world3 = new Vector3();
  private hand = new Vector3();
  private pulse = 0;

  init(): void {
    this.trays = this.world.getSystem(TraySystem) as TraySystem;
    this.cleanupFuncs.push(
      this.queries.held.subscribe('qualify', (entity) => this.onGrab(entity)),
      this.queries.held.subscribe('disqualify', (entity) =>
        this.onRelease(entity),
      ),
    );
  }

  onIntent(listener: IntentListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Put a new token on the arrival lane. */
  spawnToken(index: number): Entity {
    const parts = buildToken(index);
    parts.root.position.copy(TokenSystem.laneRest);
    TokenSystem.contentEntity.object3D?.add(parts.root);
    const entity = this.world
      .createTransformEntity(parts.root, { parent: TokenSystem.contentEntity })
      .addComponent(Token, { index, state: 'lane', zone: '' })
      .addComponent(OneHandGrabbable, { rotate: false, translate: true });
    this.views.set(entity, {
      parts,
      from: new Vector3(),
      to: new Vector3(),
      moveLeft: 0,
      moveTotal: 0,
      squashLeft: 0,
      stampZone: '',
    });
    return entity;
  }

  update(delta: number): void {
    this.pulse += delta;
    const glow = 0.35 + 0.25 * Math.sin(this.pulse * 6); // about 1 Hz
    for (const entity of this.queries.tokens.entities) {
      const view = this.views.get(entity);
      if (!view) {
        continue;
      }
      const root = view.parts.root;
      const held = entity.hasComponent(Grabbed);
      const hot = !held && this.handNear(root);
      view.parts.outline.visible = hot;
      view.parts.material.emissiveIntensity = hot ? glow : held ? 0.2 : 0;

      if (held) {
        root.getWorldPosition(this.world3);
        this.trays.setAimed(this.trays.zoneAt(this.world3));
        continue;
      }
      if (view.moveLeft > 0) {
        view.moveLeft = Math.max(0, view.moveLeft - delta);
        const t = 1 - view.moveLeft / view.moveTotal;
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        root.position.lerpVectors(view.from, view.to, eased);
        if (view.moveLeft === 0 && view.stampZone) {
          // Landed: stamp. Visual twin = tray ring pulse + token squash.
          this.trays.stamp(view.stampZone);
          view.squashLeft = SQUASH_SEC;
          view.stampZone = '';
        }
      } else if (view.squashLeft > 0) {
        view.squashLeft = Math.max(0, view.squashLeft - delta);
        const s = Math.sin((1 - view.squashLeft / SQUASH_SEC) * Math.PI);
        root.scale.set(1 + 0.12 * s, 1 - 0.18 * s, 1 + 0.12 * s);
      }
    }
  }

  private onGrab(entity: Entity): void {
    const view = this.views.get(entity);
    if (!view) {
      return;
    }
    view.moveLeft = 0;
    view.squashLeft = 0;
    view.stampZone = '';
    view.parts.root.scale.set(1, 1, 1);
    entity.setValue(Token, 'state', 'held');
    this.trays.setHolding(true);
  }

  private onRelease(entity: Entity): void {
    const view = this.views.get(entity);
    // 'disqualify' also fires when a held token is removed: ignore that.
    if (!view || !entity.active || !entity.hasComponent(Token)) {
      return;
    }
    if (this.queries.held.entities.size === 0) {
      this.trays.setHolding(false);
    }
    view.parts.root.getWorldPosition(this.world3);
    const zone = this.trays.zoneAt(this.world3);
    if (zone) {
      this.moveToTray(entity, view, zone, SNAP_SEC);
    } else {
      entity.setValue(Token, 'state', 'lane');
      entity.setValue(Token, 'zone', '');
      this.startMove(view, TokenSystem.laneRest, RETURN_SEC, '');
      console.info(
        `[token] ${entity.getValue(Token, 'index')} released outside trays, back to lane`,
      );
    }
  }

  /** True when either tracked hand (or controller grip) is close to the token. */
  private handNear(root: { getWorldPosition(target: Vector3): Vector3 }): boolean {
    root.getWorldPosition(this.world3);
    const grips = this.player.gripSpaces;
    return (
      (grips.left?.getWorldPosition(this.hand).distanceTo(this.world3) ?? 9) < NEAR_M ||
      (grips.right?.getWorldPosition(this.hand).distanceTo(this.world3) ?? 9) < NEAR_M
    );
  }

  private moveToTray(
    entity: Entity,
    view: TokenView,
    zone: Zone,
    seconds: number,
  ): void {
    entity.setValue(Token, 'state', 'tray');
    entity.setValue(Token, 'zone', zone);
    this.trays.restPosition(zone, view.to);
    view.from.copy(view.parts.root.position);
    view.moveTotal = seconds;
    view.moveLeft = seconds;
    view.stampZone = zone;
    const intent: TokenIntent = {
      type: 'place',
      tokenId: entity.getValue(Token, 'index') ?? 0,
      zone,
    };
    console.info(`[intent] ${JSON.stringify(intent)}`);
    for (const listener of this.listeners) {
      listener(intent);
    }
  }

  private startMove(
    view: TokenView,
    target: Vector3,
    seconds: number,
    stampZone: Zone | '',
  ): void {
    view.from.copy(view.parts.root.position);
    view.to.copy(target);
    view.moveTotal = seconds;
    view.moveLeft = seconds;
    view.stampZone = stampZone;
  }
}
