// Tray presentation and hit-testing. No game rules: a tray only knows its zone.
import { createSystem, type Entity, Vector3 } from '@iwsdk/core';
import { TRAY, type Zone } from '../../scene/config.js';
import type { TrayParts } from '../../scene/ward.js';
import { Tray } from '../components.js';

/** Accept a release this far outside the tray edge and this high above it. */
const EDGE_MARGIN = 0.012;
const MAX_HEIGHT = 0.16;
const STAMP_SEC = 0.45;

interface TrayView {
  parts: TrayParts;
  stamp: number; // seconds left of the stamp pulse, 0 = idle
}

export class TraySystem extends createSystem({
  trays: { required: [Tray] },
}) {
  private views = new Map<Zone, TrayView>();
  private holding = false;
  private aimed: Zone | '' = '';
  private local = new Vector3();

  /** Called by bootstrap for each tray entity. */
  addTray(parts: TrayParts): void {
    this.views.set(parts.zone, { parts, stamp: 0 });
  }

  zoneOf(entity: Entity): Zone | '' {
    return (entity.getValue(Tray, 'zone') ?? '') as Zone | '';
  }

  /** Which tray, if any, is under a world position. */
  zoneAt(world: Vector3): Zone | '' {
    const half = TRAY.size / 2 + EDGE_MARGIN;
    for (const view of this.views.values()) {
      const root = view.parts.root;
      root.updateWorldMatrix(true, false);
      root.worldToLocal(this.local.copy(world));
      if (
        Math.abs(this.local.x) <= half &&
        Math.abs(this.local.z) <= half &&
        this.local.y >= -0.03 &&
        this.local.y <= MAX_HEIGHT
      ) {
        return view.parts.zone;
      }
    }
    return '';
  }

  /** Tray centre in the ward content frame (where a snapped token stands). */
  restPosition(zone: Zone, out: Vector3): Vector3 {
    const view = this.views.get(zone);
    if (view) {
      out.copy(view.parts.root.position);
      out.y += 0.013;
    }
    return out;
  }

  /** A token is in the hand: light every tray edge. */
  setHolding(holding: boolean): void {
    this.holding = holding;
    if (!holding) {
      this.aimed = '';
    }
  }

  /** The tray currently under the held token (brighter edge). */
  setAimed(zone: Zone | ''): void {
    this.aimed = zone;
  }

  /** Visual twin of the stamp sound: the tray ring flashes and expands. */
  stamp(zone: Zone): void {
    const view = this.views.get(zone);
    if (view) {
      view.stamp = STAMP_SEC;
    }
  }

  update(delta: number): void {
    for (const view of this.views.values()) {
      const ring = view.parts.ring;
      const material = ring.material as { opacity: number };
      if (view.stamp > 0) {
        view.stamp = Math.max(0, view.stamp - delta);
        const t = 1 - view.stamp / STAMP_SEC;
        ring.scale.setScalar(1 + 0.35 * t);
        material.opacity = 1 - t;
        continue;
      }
      ring.scale.setScalar(1);
      material.opacity = !this.holding
        ? 0
        : view.parts.zone === this.aimed
          ? 1
          : 0.45;
    }
  }
}
