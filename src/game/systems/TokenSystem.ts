// Patient tokens: arrive on the lane, pinch-grab, release over a tray, snap.
// Emits a typed TokenIntent and does what ShiftSystem tells it afterwards.
// It never calls the runtime and never applies a game rule.
import {
  createSystem,
  type Entity,
  Grabbed,
  GrabSystem,
  OneHandGrabbable,
  Vector3,
} from '@iwsdk/core';
import type { Zone } from '../../scene/config.js';
import { buildToken, TIMER_SEGMENTS, type TokenParts } from '../../scene/token.js';
import { Token, type TokenIntent } from '../components.js';
import { TraySystem } from './TraySystem.js';

const SNAP_SEC = 0.11;
const SQUASH_SEC = 0.14;
const RETURN_SEC = 0.22;
/** A hand this close to a waiting token lights its outline ("near" feedback). */
const NEAR_M = 0.12;
/** A token parked on a tray shrinks so it does not hide the tray's shape. Still 3.5 cm wide. */
const PLACED_SCALE = 0.65;

interface TokenView {
  parts: TokenParts;
  slot: number;
  from: Vector3;
  to: Vector3;
  moveLeft: number; // seconds left of the move, 0 = not moving
  moveTotal: number;
  squashLeft: number;
  stampZone: Zone | '';
  /** Scale the token is easing towards (1 in lane or hand, PLACED_SCALE on a tray). */
  restScale: number;
  /** Where the token was before the last tray move, for revert(). '' = lane. */
  prevZone: Zone | '';
  /** Resolved: no more input; removed when this reaches 0. -1 = not scheduled. */
  removeIn: number;
}

type IntentListener = (intent: TokenIntent) => void;

export class TokenSystem extends createSystem({
  tokens: { required: [Token] },
  held: { required: [Token, Grabbed] },
}) {
  /** Set by bootstrap before registration. */
  static contentEntity: Entity;
  static laneSlots: Vector3[];

  /** Number of pickups so far (any token). */
  grabs = 0;

  /** Index of the token last held or approached by a hand, -1 if none yet. */
  lastTouched = -1;

  private views = new Map<Entity, TokenView>();
  private byIndex = new Map<number, Entity>();
  private slotUsed: boolean[] = [];
  private listeners = new Set<IntentListener>();
  private trays!: TraySystem;
  private grab!: GrabSystem;
  private world3 = new Vector3();
  private hand = new Vector3();
  private pulse = 0;
  private doomed: Entity[] = [];
  /** Count of releases handled, shown in the log so identical lines stay distinct. */
  private releases = 0;

  init(): void {
    this.trays = this.world.getSystem(TraySystem) as TraySystem;
    this.grab = this.world.getSystem(GrabSystem) as GrabSystem;
    this.slotUsed = TokenSystem.laneSlots.map(() => false);
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

  /** Number of tokens currently in a hand. */
  get heldCount(): number {
    return this.queries.held.entities.size;
  }

  isHeld(index: number): boolean {
    const entity = this.byIndex.get(index);
    return !!entity && entity.hasComponent(Grabbed);
  }

  /** Put a new token on the first free lane slot. */
  spawnToken(index: number): Entity {
    let slot = this.slotUsed.indexOf(false);
    if (slot < 0) {
      slot = TokenSystem.laneSlots.length - 1; // lane full: share the last slot
    }
    this.slotUsed[slot] = true;
    const parts = buildToken(index);
    parts.root.position.copy(TokenSystem.laneSlots[slot]);
    TokenSystem.contentEntity.object3D?.add(parts.root);
    const entity = this.world
      .createTransformEntity(parts.root, { parent: TokenSystem.contentEntity })
      .addComponent(Token, { index, state: 'lane', zone: '' })
      .addComponent(OneHandGrabbable, { rotate: false, translate: true });
    this.views.set(entity, {
      parts,
      slot,
      from: new Vector3(),
      to: new Vector3(),
      moveLeft: 0,
      moveTotal: 0,
      squashLeft: 0,
      stampZone: '',
      restScale: 1,
      prevZone: '',
      removeIn: -1,
    });
    this.byIndex.set(index, entity);
    return entity;
  }

  /**
   * Window ring. `fraction` is the share of the full standard window still
   * left (so a shorter surge window starts as a shorter ring); `urgent` turns
   * it amber and dashed (shape cue, not colour only). Values come from the runtime.
   */
  setWindow(index: number, fraction: number, urgent: boolean, surge = false): void {
    const entity = this.byIndex.get(index);
    const view = entity && this.views.get(entity);
    if (!view) {
      return;
    }
    // A surge patient's ring is drawn shorter (three quarters), so the shorter window reads at a glance.
    const full = surge ? Math.round(TIMER_SEGMENTS * 0.75) : TIMER_SEGMENTS;
    const lit = view.removeIn >= 0 ? 0 : Math.ceil(Math.max(0, Math.min(1, fraction)) * full);
    view.parts.timerMaterial.color.setHex(urgent ? 0xffc35c : 0x9ec1ff);
    const { timer, timerDashed } = view.parts;
    timer.visible = !urgent && lit > 0;
    timerDashed.visible = urgent && lit > 0;
    timer.geometry.setDrawRange(0, lit * 6);
    timerDashed.geometry.setDrawRange(0, Math.ceil(lit / 2) * 6);
  }

  /** The last tray move was not accepted: send the token back where it was, silently. */
  revert(index: number): void {
    const entity = this.byIndex.get(index);
    const view = entity && this.views.get(entity);
    if (!entity || !view) {
      return;
    }
    this.rest(entity, view, view.prevZone, RETURN_SEC);
  }

  /**
   * The patient is resolved. The token takes no more input, stands on the tray
   * of the final call (given by the runtime) and leaves after `seconds`.
   */
  retire(index: number, finalZone: Zone, seconds: number): void {
    const entity = this.byIndex.get(index);
    const view = entity && this.views.get(entity);
    if (!entity || !view) {
      return;
    }
    view.removeIn = seconds;
    if (entity.hasComponent(Grabbed)) {
      this.grab.forceRelease(entity); // onRelease sees removeIn and stays quiet
    }
    entity.setValue(Token, 'state', 'done');
    view.parts.timer.visible = false;
    view.parts.timerDashed.visible = false;
    this.rest(entity, view, finalZone, RETURN_SEC);
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
      const done = view.removeIn >= 0;
      const hot = !held && !done && this.handNear(root);
      if (held || hot) {
        this.lastTouched = entity.getValue(Token, 'index') ?? -1;
      }
      view.parts.outline.visible = hot;
      view.parts.material.emissiveIntensity = hot ? glow : held ? 0.2 : 0;

      if (done) {
        view.removeIn -= delta;
        if (view.removeIn <= 0 && !held) {
          this.doomed.push(entity);
          continue;
        }
      }
      if (held) {
        root.getWorldPosition(this.world3);
        this.trays.setAimed(this.trays.zoneAt(this.world3));
        continue;
      }
      if (view.moveLeft > 0) {
        view.moveLeft = Math.max(0, view.moveLeft - delta);
        const t = 1 - view.moveLeft / view.moveTotal;
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        // A landing with a stamp overshoots slightly (docs/02 juice list); other moves do not.
        const u = t - 1;
        const along = view.stampZone ? 1 + 2.2 * u * u * u + 1.2 * u * u : eased;
        root.position.lerpVectors(view.from, view.to, along);
        root.scale.setScalar(
          root.scale.x + (view.restScale - root.scale.x) * eased,
        );
        if (view.moveLeft === 0 && view.stampZone) {
          // Landed: stamp. Visual twin = tray ring pulse + token squash.
          this.trays.stamp(view.stampZone);
          view.squashLeft = SQUASH_SEC;
          view.stampZone = '';
        }
      } else if (view.squashLeft > 0) {
        view.squashLeft = Math.max(0, view.squashLeft - delta);
        const s = Math.sin((1 - view.squashLeft / SQUASH_SEC) * Math.PI);
        const k = view.restScale;
        root.scale.set(k * (1 + 0.12 * s), k * (1 - 0.18 * s), k * (1 + 0.12 * s));
      }
    }
    while (this.doomed.length > 0) {
      this.remove(this.doomed.pop() as Entity);
    }
  }

  private remove(entity: Entity): void {
    const view = this.views.get(entity);
    if (view) {
      this.slotUsed[view.slot] = false;
      view.parts.root.removeFromParent();
    }
    this.byIndex.delete(entity.getValue(Token, 'index') ?? -1);
    this.views.delete(entity);
    entity.dispose();
  }

  private onGrab(entity: Entity): void {
    const view = this.views.get(entity);
    if (!view) {
      return;
    }
    view.moveLeft = 0;
    view.squashLeft = 0;
    view.stampZone = '';
    view.restScale = 1;
    view.parts.root.scale.set(1, 1, 1);
    entity.setValue(Token, 'state', 'held');
    this.grabs += 1;
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
    if (view.removeIn >= 0) {
      return; // resolved while in the hand: retire() already sent it to its tray
    }
    const index = entity.getValue(Token, 'index') ?? 0;
    this.releases += 1;
    const current = (entity.getValue(Token, 'zone') ?? '') as Zone | '';
    view.parts.root.getWorldPosition(this.world3);
    const zone = this.trays.zoneAt(this.world3);
    if (!zone || zone === current) {
      // Outside every tray, or back on the tray it came from: nothing changed.
      this.rest(entity, view, current, zone ? SNAP_SEC : RETURN_SEC);
      console.info(
        `[token] ${index} ${zone ? `put back on ${zone}, no change` : current ? `released outside trays, back to ${current}` : 'released outside trays, back to lane'} (release ${this.releases})`,
      );
      return;
    }
    view.prevZone = current;
    entity.setValue(Token, 'state', 'tray');
    entity.setValue(Token, 'zone', zone);
    view.restScale = PLACED_SCALE;
    this.trays.restPosition(zone, view.to);
    this.startMove(view, SNAP_SEC, zone);
    const intent: TokenIntent = { type: 'place', tokenId: index, zone };
    console.info(`[intent] ${JSON.stringify(intent)} (release ${this.releases})`);
    for (const listener of this.listeners) {
      listener(intent);
    }
  }

  /** Move to a resting place without stamp or intent: a tray, or the lane slot for ''. */
  private rest(entity: Entity, view: TokenView, zone: Zone | '', seconds: number): void {
    entity.setValue(Token, 'zone', zone);
    if (view.removeIn < 0) {
      entity.setValue(Token, 'state', zone ? 'tray' : 'lane');
    }
    if (zone) {
      view.restScale = PLACED_SCALE;
      this.trays.restPosition(zone, view.to);
    } else {
      view.restScale = 1;
      view.to.copy(TokenSystem.laneSlots[view.slot]);
    }
    this.startMove(view, seconds, '');
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

  /** Start easing from the current position to `view.to`. */
  private startMove(view: TokenView, seconds: number, stampZone: Zone | ''): void {
    view.from.copy(view.parts.root.position);
    view.moveTotal = seconds;
    view.moveLeft = seconds;
    view.stampZone = stampZone;
  }
}
