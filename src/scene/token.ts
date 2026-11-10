// Patient token: an abstract low-poly figure, 5.4 cm wide and about 6 cm tall.
// Origin at its base. Width follows docs/04 section 3 (token about 5 cm).
import {
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
  SphereGeometry,
} from '@iwsdk/core';
import { PALETTE } from './palette.js';

export interface TokenParts {
  root: Mesh;
  /** Ring at the base: the hover / selected outline. */
  outline: Mesh;
  material: MeshLambertMaterial;
  /** Window ring: TIMER_SEGMENTS arcs around the base, hidden from the end as time runs out. */
  timer: Mesh[];
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
  const step = (Math.PI * 2) / TIMER_SEGMENTS;
  const timer: Mesh[] = [];
  for (let k = 0; k < TIMER_SEGMENTS; k++) {
    const arc = new Mesh(
      new RingGeometry(0.039, 0.045, 2, 1, Math.PI / 2 - (k + 1) * step + 0.008, step - 0.016),
      timerMaterial,
    );
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.0012;
    arc.visible = false;
    root.add(arc);
    timer.push(arc);
  }

  return { root, outline, material, timer, timerMaterial };
}
