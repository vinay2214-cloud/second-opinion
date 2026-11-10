// Table furniture for the shift: vitals card, speech panel (HUD line, prompt,
// advice, result), Keep, Start and Pause buttons, plinth name labels, debrief
// panel. Geometry and placement only (docs/02 section 2).
//
// Text size rule (FR-20): capitals at least 1.2 cm tall at 50 cm, scaled with
// distance. Capitals are about 0.7 em. From the seated eye point (40 cm above
// the table, 40 cm behind the ward centre):
//   vitals card  about 0.46 m -> cap >= 1.10 cm -> em >= 0.016
//   speech panel about 0.65 m -> cap >= 1.56 cm -> em >= 0.0225
//   debrief      about 0.55 m -> cap >= 1.32 cm -> em >= 0.019
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from '@iwsdk/core';
import { createTextPanel, type TextPanel } from '../ui/TextPanel.js';
import { createFlatLabel } from './label.js';
import { PALETTE } from './palette.js';

export const TEXT_EM = {
  card: 0.017,
  speech: 0.023,
  speechHead: 0.026,
  debrief: 0.0195,
  debriefHead: 0.024,
} as const;

export interface ButtonParts {
  root: Group;
  cap: MeshLambertMaterial;
  labels: Mesh[];
}

export interface ShiftUiParts {
  card: TextPanel;
  speech: TextPanel;
  debrief: TextPanel;
  keep: ButtonParts;
  start: ButtonParts;
  /** labels[0] = "Pause", labels[1] = "Resume". */
  pause: ButtonParts;
}

function button(
  name: string,
  width: number,
  depth: number,
  texts: string[],
  color: number,
): ButtonParts {
  const root = new Group();
  root.name = name;
  const cap = new MeshLambertMaterial({ color });
  const box = new Mesh(new BoxGeometry(width, 0.014, depth), cap);
  box.position.y = 0.007;
  root.add(box);
  const labels = texts.map((text, i) => {
    const label = createFlatLabel(text, {
      width: width * 0.92,
      height: Math.min(depth * 0.6, 0.024),
      color: PALETTE.text,
    });
    label.position.y = 0.0145;
    label.visible = i === 0;
    root.add(label);
    return label;
  });
  return { root, cap, labels };
}

export function buildShiftUi(): ShiftUiParts {
  const card = createTextPanel('Vitals Card', 0.34, 0.12);
  // Lies on the near edge, raised 20 degrees so it faces a seated player
  // without hiding the tray labels behind it.
  card.mesh.rotation.x = -Math.PI / 2 + (20 * Math.PI) / 180;
  card.mesh.position.set(-0.035, 0.026, 0.131);
  card.mesh.visible = false;

  const speech = createTextPanel('Speech Panel', 0.56, 0.26);
  speech.mesh.rotation.x = (-15 * Math.PI) / 180;
  speech.mesh.position.set(0, 0.205, -0.225);

  const debrief = createTextPanel('Debrief Panel', 0.56, 0.36);
  debrief.mesh.rotation.x = (-25 * Math.PI) / 180;
  debrief.mesh.position.set(0, 0.2, -0.1);
  debrief.mesh.visible = false;

  const keep = button('Keep Button', 0.045, 0.045, ['Keep'], PALETTE.button);
  keep.root.position.set(0.19, 0.005, 0.098);

  // Where the card will be; only shown before the first patient.
  const start = button('Start Button', 0.14, 0.05, ['Start shift'], PALETTE.keepOn);
  start.root.position.set(-0.035, 0.005, 0.13);
  start.root.visible = false;

  const pause = button('Pause Button', 0.045, 0.045, ['Pause', 'Resume'], PALETTE.button);
  pause.root.position.set(-0.25, 0.005, 0.15);

  return { card, speech, debrief, keep, start, pause };
}

/** Name label tilted toward the player, in front of an advisor plinth. */
export function labelPlinth(plinth: Object3D, name: string, onDuty: boolean): Mesh {
  const label = createFlatLabel(name, {
    width: 0.085,
    height: 0.024,
    color: onDuty ? PALETTE.text : '#7d8aa3',
  });
  label.rotation.x = -Math.PI / 4;
  label.position.set(0, 0.012, 0.044);
  plinth.add(label);
  return label;
}

export function showButtonLabel(parts: ButtonParts, index: number): void {
  parts.labels.forEach((label, i) => {
    label.visible = i === index;
  });
}
