// Table furniture for the shift: vitals card, speech / result panel, Keep
// button, debrief panel. Geometry and placement only (docs/02 section 2).
import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from '@iwsdk/core';
import { createTextPanel, type TextPanel } from '../ui/TextPanel.js';
import { createFlatLabel } from './label.js';
import { PALETTE } from './palette.js';

export interface ShiftUiParts {
  /** Near edge, tilted toward the player. Poke to expand. */
  card: TextPanel;
  /** Stands behind the advisor rail: prompt, advisor speech, result. */
  speech: TextPanel;
  debrief: TextPanel;
  keepButton: Group;
  keepCap: MeshLambertMaterial;
}

export const CARD = { width: 0.4, height: 0.105 } as const;
export const KEEP = { size: 0.045 } as const;

export function buildShiftUi(): ShiftUiParts {
  const card = createTextPanel('Vitals Card', CARD.width, CARD.height);
  // Lies on the near edge, raised 20 degrees so it faces a seated player
  // without hiding the tray labels behind it.
  card.mesh.rotation.x = -Math.PI / 2 + (20 * Math.PI) / 180;
  card.mesh.position.set(-0.07, 0.026, 0.131);
  card.mesh.visible = false;

  const speech = createTextPanel('Speech Panel', 0.48, 0.14);
  speech.mesh.rotation.x = (-15 * Math.PI) / 180;
  speech.mesh.position.set(0, 0.175, -0.215);

  const debrief = createTextPanel('Debrief Panel', 0.54, 0.3);
  debrief.mesh.rotation.x = (-15 * Math.PI) / 180;
  debrief.mesh.position.set(0, 0.25, -0.2);
  debrief.mesh.visible = false;

  const keepButton = new Group();
  keepButton.name = 'Keep Button';
  const keepCap = new MeshLambertMaterial({ color: PALETTE.button });
  const cap = new Mesh(new BoxGeometry(KEEP.size, 0.014, KEEP.size), keepCap);
  cap.position.y = 0.007;
  keepButton.add(cap);
  const label = createFlatLabel('Keep', {
    width: 0.042,
    height: 0.02,
    color: PALETTE.text,
  });
  label.position.y = 0.0145;
  keepButton.add(label);
  keepButton.position.set(0.19, 0.005, 0.098);

  return { card, speech, debrief, keepButton, keepCap };
}
