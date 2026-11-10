// The onboarding "ghost hand": a simple translucent hand that shows a gesture.
// Original, built from boxes. Purely visual; it never touches game state.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial } from '@iwsdk/core';

export interface GhostHand {
  root: Group;
  /** A faint copy of a token, shown while the hand demonstrates a carry. */
  token: Mesh;
  material: MeshBasicMaterial;
}

export function buildGhostHand(): GhostHand {
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const root = new Group();
  root.name = 'Ghost Hand';
  const palm = new Mesh(new BoxGeometry(0.05, 0.014, 0.05), material);
  palm.position.set(0, 0.05, 0.045);
  root.add(palm);
  // Index finger and thumb meet at the origin (the pinch / poke point).
  const index = new Mesh(new BoxGeometry(0.012, 0.012, 0.05), material);
  index.position.set(0.008, 0.028, 0.012);
  index.rotation.x = 0.9;
  root.add(index);
  const thumb = new Mesh(new BoxGeometry(0.012, 0.012, 0.04), material);
  thumb.position.set(-0.014, 0.024, 0.016);
  thumb.rotation.set(0.8, 0.5, 0);
  root.add(thumb);
  for (let k = 0; k < 3; k++) {
    const finger = new Mesh(new BoxGeometry(0.011, 0.011, 0.034), material);
    finger.position.set(0.02 - k * 0.014 - 0.014, 0.046, 0.008);
    finger.rotation.x = 0.35;
    root.add(finger);
  }
  const body = new CylinderGeometry(0.014, 0.018, 0.026, 8);
  body.translate(0, -0.016, 0);
  const token = new Mesh(body, material);
  root.add(token);
  root.visible = false;
  return { root, token, material };
}
