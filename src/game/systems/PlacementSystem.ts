// Places the ward on a detected horizontal plane (pinch or poke to confirm) or,
// after PLACEMENT.planeTimeoutSec, on a virtual table. Never shows an error.
// Adapter only: no game rules here (AGENTS.md architecture rule).
import {
  createSystem,
  type Entity,
  type Object3D,
  PokeInteractable,
  Pressed,
  RayInteractable,
  Quaternion,
  Vector3,
  Visibility,
  VisibilityState,
  XRAnchor,
  XRPlane,
} from '@iwsdk/core';
import { PlacementPad, RecentreButton } from '../../scene/components.js';
import { PLACEMENT, WARD } from '../../scene/config.js';
import type { WardRuntime } from '../../scene/bootstrap.js';
import type { WardParts } from '../../scene/ward.js';

type Phase = 'searching' | 'confirming' | 'placed';
type Mode = 'plane' | 'virtual';

interface PlaneLike {
  orientation?: string;
  polygon?: ArrayLike<{ x: number; z: number }>;
}

const UP = new Vector3(0, 1, 0);

export class PlacementSystem extends createSystem({
  planes: { required: [XRPlane] },
  padPressed: { required: [PlacementPad, Pressed] },
  recentrePressed: { required: [RecentreButton, Pressed] },
}) {
  /** Set by bootstrap before the system is registered. */
  static ward: WardRuntime;

  private parts!: WardParts;
  private wardEntity!: Entity;
  private contentEntity!: Entity;
  private padEntity!: Entity;

  private phase: Phase = 'searching';
  private mode: Mode = 'virtual';
  private elapsed = 0;
  private pulse = 0;
  private immersive = false;
  private confirmRequested = false;
  private recentreRequested = false;

  private head = new Vector3();
  private forward = new Vector3();
  private target = new Vector3();
  private local = new Vector3();
  private best = new Vector3();
  private toHead = new Vector3();
  private worldQuat = new Quaternion();
  private parentQuat = new Quaternion();

  init(): void {
    const runtime = PlacementSystem.ward;
    this.parts = runtime.parts;
    this.wardEntity = runtime.wardEntity;
    this.contentEntity = runtime.contentEntity;
    this.padEntity = runtime.padEntity;

    // Act when the pinch or poke is let go, not when it starts. Hiding a target
    // while a hand is still pressing it left that hand unable to grab afterwards.
    this.cleanupFuncs.push(
      this.queries.padPressed.subscribe('disqualify', () => {
        if (this.phase === 'confirming') {
          this.confirmRequested = true;
        }
      }),
      this.queries.recentrePressed.subscribe('disqualify', () => {
        this.recentreRequested = true;
      }),
    );
    this.beginSearch();
  }

  /** Re-anchor the ward in front of the player (docs/04: Re-centre). */
  recentre(): void {
    if (this.mode === 'virtual') {
      this.placeVirtual('recentre');
    } else {
      this.beginSearch();
    }
  }

  update(delta: number): void {
    const immersive =
      this.visibilityState.peek() !== VisibilityState.NonImmersive;
    if (immersive !== this.immersive) {
      // Entering or leaving XR changes the head pose: place again.
      this.immersive = immersive;
      this.beginSearch();
    }
    if (this.recentreRequested) {
      this.recentreRequested = false;
      if (this.phase === 'placed') {
        this.recentre();
      }
    }

    if (this.phase === 'placed') {
      return;
    }
    this.elapsed += delta;

    if (!this.immersive) {
      // Desktop preview (FR-06): no planes exist, show the virtual table at once.
      this.placeVirtual('desktop');
      return;
    }

    if (this.phase === 'searching') {
      if (this.findPlaneSpot()) {
        this.setWorldPose(this.best);
        this.phase = 'confirming';
        this.elapsed = 0;
        this.setPadActive(true);
        console.info('[placement] plane found, waiting for confirm');
      } else if (this.elapsed >= PLACEMENT.planeTimeoutSec) {
        this.placeVirtual('timeout');
      }
      return;
    }

    // confirming: pulse the pad (under 3 Hz), wait for a pinch or a poke.
    this.pulse += delta;
    const pad = this.parts.placementPad.material as { opacity: number };
    pad.opacity = 0.3 + 0.15 * Math.sin(this.pulse * 4);
    if (this.confirmRequested || this.elapsed >= PLACEMENT.confirmTimeoutSec) {
      const how = this.confirmRequested ? 'confirmed' : 'auto-accepted';
      this.finishPlacement('plane', how);
    }
  }

  /**
   * The pad covers the whole ward. It must only take pointer input while it is
   * shown, otherwise it swallows grabs and presses meant for tokens and trays.
   */
  private setPadActive(active: boolean): void {
    this.padEntity.setValue(Visibility, 'isVisible', active);
    if (active) {
      if (!this.padEntity.hasComponent(RayInteractable)) {
        this.padEntity.addComponent(RayInteractable);
      }
      if (!this.padEntity.hasComponent(PokeInteractable)) {
        this.padEntity.addComponent(PokeInteractable);
      }
    } else {
      if (this.padEntity.hasComponent(RayInteractable)) {
        this.padEntity.removeComponent(RayInteractable);
      }
      if (this.padEntity.hasComponent(PokeInteractable)) {
        this.padEntity.removeComponent(PokeInteractable);
      }
    }
  }

  private beginSearch(): void {
    this.phase = 'searching';
    this.elapsed = 0;
    this.pulse = 0;
    this.confirmRequested = false;
    this.contentEntity.setValue(Visibility, 'isVisible', false);
    this.setPadActive(false);
  }

  private placeVirtual(reason: string): void {
    this.readHead();
    this.target
      .copy(this.head)
      .addScaledVector(this.forward, WARD.forward);
    this.target.y = this.head.y - WARD.below;
    this.setWorldPose(this.target);
    this.finishPlacement('virtual', reason);
  }

  private finishPlacement(mode: Mode, how: string): void {
    this.mode = mode;
    this.phase = 'placed';
    this.confirmRequested = false;
    this.parts.virtualTable.visible = mode === 'virtual';
    this.setPadActive(false);
    this.contentEntity.setValue(Visibility, 'isVisible', true);
    if (this.immersive && !this.wardEntity.hasComponent(XRAnchor)) {
      // SceneUnderstandingSystem attaches the ward to its world-anchored group.
      this.wardEntity.addComponent(XRAnchor);
    }
    this.parts.root.getWorldPosition(this.local);
    console.info(
      `[placement] placed mode=${mode} how=${how} t=${this.elapsed.toFixed(2)}s at`,
      this.local.x.toFixed(3),
      this.local.y.toFixed(3),
      this.local.z.toFixed(3),
    );
  }

  private readHead(): void {
    // Outside XR the tracked head sits at the origin; the browser camera is the viewer.
    const head = this.immersive ? this.player.head : this.camera;
    head.updateWorldMatrix(true, false);
    head.getWorldPosition(this.head);
    head.getWorldQuaternion(this.worldQuat);
    this.forward.set(0, 0, -1).applyQuaternion(this.worldQuat);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) {
      this.forward.set(0, 0, -1);
    }
    this.forward.normalize();
  }

  /** Put the ward root at a world position, facing the player, whatever its parent. */
  private setWorldPose(worldPosition: Vector3): void {
    const root = this.parts.root;
    this.toHead.copy(this.head).sub(worldPosition);
    this.toHead.y = 0;
    if (this.toHead.lengthSq() < 1e-6) {
      this.toHead.copy(this.forward).negate();
    }
    const yaw = Math.atan2(this.toHead.x, this.toHead.z); // ward +Z toward the head
    this.worldQuat.setFromAxisAngle(UP, yaw);
    const parent = root.parent;
    root.position.copy(worldPosition);
    if (parent) {
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(root.position);
      parent.getWorldQuaternion(this.parentQuat).invert();
      root.quaternion.copy(this.parentQuat).multiply(this.worldQuat);
    } else {
      root.quaternion.copy(this.worldQuat);
    }
    root.updateMatrixWorld(true);
  }

  /**
   * Looks for a table-like horizontal plane near the player. On success writes
   * the ward centre (world) into `this.best`.
   */
  private findPlaneSpot(): boolean {
    this.readHead();
    let bestDistance = Infinity;
    for (const entity of this.queries.planes.entities) {
      const plane = entity.getValue(XRPlane, '_plane') as PlaneLike | undefined;
      const object = entity.object3D as Object3D | undefined;
      if (!plane || !object || plane.orientation !== 'horizontal') {
        continue;
      }
      const polygon = plane.polygon;
      if (!polygon || polygon.length < 3) {
        continue;
      }
      object.updateWorldMatrix(true, false);
      // Where we would like the ward: in front of the head, at the plane's height.
      this.target.copy(this.head).addScaledVector(this.forward, WARD.forward);
      object.worldToLocal(this.local.copy(this.target));
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < polygon.length; i++) {
        const point = polygon[i];
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
      }
      // Keep the ward on the surface where the plane is big enough for a margin.
      const marginX = Math.min(WARD.depth / 2, (maxX - minX) / 2);
      const marginZ = Math.min(WARD.depth / 2, (maxZ - minZ) / 2);
      this.local.set(
        Math.min(maxX - marginX, Math.max(minX + marginX, this.local.x)),
        0,
        Math.min(maxZ - marginZ, Math.max(minZ + marginZ, this.local.z)),
      );
      object.localToWorld(this.local);
      const below = this.head.y - this.local.y;
      if (below < PLACEMENT.minBelowEyes || below > PLACEMENT.maxBelowEyes) {
        continue;
      }
      const dx = this.local.x - this.head.x;
      const dz = this.local.z - this.head.z;
      const distance = Math.hypot(dx, dz);
      if (distance > PLACEMENT.maxPlaneDistance || distance >= bestDistance) {
        continue;
      }
      bestDistance = distance;
      this.best.copy(this.local);
    }
    return bestDistance < Infinity;
  }
}
