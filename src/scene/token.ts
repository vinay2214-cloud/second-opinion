// Patient token: an abstract low-poly figure, 5.4 cm wide and about 6 cm tall.
// Origin at its base. Width follows docs/04 section 3 (token about 5 cm).
import {
  CircleGeometry,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
  SphereGeometry,
} from '@iwsdk/core';
import { makeOpaque, SAFE } from './flags.js';
import { PALETTE } from './palette.js';

export interface TokenParts {
  root: Mesh;
  /** Ring at the base: the hover / selected outline. */
  outline: Mesh;
  material: MeshLambertMaterial;
  /**
   * Window ring, one draw call each: `timer` is solid, `timerDashed` shows every
   * other segment (last seconds). TokenSystem shortens them with setDrawRange.
   */
  timer: Mesh;
  timerDashed: Mesh;
  timerMaterial: MeshBasicMaterial;
}

export const TIMER_SEGMENTS = 24;

export function buildToken(index: number): TokenParts {
  const material = new MeshLambertMaterial({
    color: 0xe8eef9,
    emissive: PALETTE.accent,
    emissiveIntensity: 0,
  });
  const body = new CylinderGeometry(0.021, 0.027, 0.04, 8);
  body.translate(0, 0.02, 0);
  const root = new Mesh(body, material);
  root.name = `Token ${index}`;

  const head = new Mesh(new SphereGeometry(0.016, 8, 6), material);
  head.position.y = 0.05;
  root.add(head);

  const outline = new Mesh(
    new RingGeometry(0.031, 0.037, 24),
    new MeshBasicMaterial({
      color: PALETTE.accent,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  outline.rotation.x = -Math.PI / 2;
  outline.position.y = 0.0015;
  outline.visible = false;
  root.add(outline);

  // Window ring: starts at 12 o'clock (far side) and empties clockwise.
  const timerMaterial = new MeshBasicMaterial({
    color: 0x9ec1ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const ring = () => {
    // Negative sweep so segment 0 starts at 12 o'clock and the ring runs clockwise from above.
    const mesh = new Mesh(
      new RingGeometry(0.039, 0.045, TIMER_SEGMENTS, 1, Math.PI / 2, -Math.PI * 2),
      timerMaterial,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.0012;
    mesh.visible = false;
    root.add(mesh);
    return mesh;
  };
  const timer = ring();
  timerMaterial.side = 2; // DoubleSide: the negative sweep flips the winding
  const timerDashed = ring();
  // Keep only every other segment's triangles (6 indices per segment), packed at the front.
  const all = timerDashed.geometry.getIndex();
  if (all) {
    const kept: number[] = [];
    for (let k = 0; k < TIMER_SEGMENTS; k += 2) {
      for (let j = 0; j < 6; j++) {
        kept.push(all.getX(k * 6 + j));
      }
    }
    timerDashed.geometry.setIndex(kept);
  }

  // Blob shadow: grounds the token without real-time shadows. Skipped in safe mode.
  if (!SAFE) {
    const shadow = new Mesh(
      new CircleGeometry(0.032, 20),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.0006;
    root.add(shadow);
  }
  makeOpaque(root);

  return { root, outline, material, timer, timerDashed, timerMaterial };
}
