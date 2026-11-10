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
  /** One start button per module, left to right: Module 1, 2, 3. */
  starts: ButtonParts[];
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
  const card = createTextPanel('Vitals Card', 0.34, 0.135);
  // Lies on the near edge, raised 20 degrees so it faces a seated player
  // without hiding the tray labels behind it.
  card.mesh.rotation.x = -Math.PI / 2 + (20 * Math.PI) / 180;
  card.mesh.position.set(-0.035, 0.026, 0.131);
  card.mesh.visible = false;

  const speech = createTextPanel('Speech Panel', 0.56, 0.3);
  speech.mesh.rotation.x = (-15 * Math.PI) / 180;
  speech.mesh.position.set(0, 0.22, -0.225);

  const debrief = createTextPanel('Debrief Panel', 0.56, 0.36);
  debrief.mesh.rotation.x = (-25 * Math.PI) / 180;
  debrief.mesh.position.set(0, 0.2, -0.1);
  debrief.mesh.visible = false;

  const keep = button('Keep Button', 0.045, 0.045, ['Keep'], PALETTE.button);
  keep.root.position.set(0.19, 0.005, 0.098);

  // Where the card will be; only shown before the first patient.
  // 9 cm wide, 2 cm gaps. labels[0] = unlocked, labels[1] = locked.
  const starts = [1, 2, 3].map((n, i) => {
    const parts = button(
      `Start Module ${n}`,
      0.09,
      0.05,
      [`Module ${n}`, `Module ${n} \u{1F512}`],
      PALETTE.keepOn,
    );
    parts.root.position.set(-0.145 + i * 0.11, 0.005, 0.13);
    return parts;
  });

  const pause = button('Pause Button', 0.045, 0.045, ['Pause', 'Resume'], PALETTE.button);
  pause.root.position.set(-0.25, 0.005, 0.15);

  return { card, speech, debrief, keep, starts, pause };
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

/**
 * Drift cue: a small 'update installed' tag above an advisor (docs/02 section 7).
 * Small and quiet by design, still at least 1.2 cm text at its distance.
 */
export function buildDriftBadge(plinth: Object3D, text: string): Mesh {
  // A tag hovering above the advisor, nearly upright: about 1.3 cm capitals at 60 cm.
  // Wider than the plinth pitch, so it floats above the neighbours (not a target).
  const badge = createFlatLabel(text, {
    width: 0.17,
    height: 0.026,
    color: '#0b1220',
    background: '#c9d6ea',
    bold: false,
  });
  badge.rotation.x = -Math.PI / 8;
  badge.position.set(0, 0.105, 0.012);
  badge.visible = false;
  plinth.add(badge);
  return badge;
}

export function showButtonLabel(parts: ButtonParts, index: number): void {
  parts.labels.forEach((label, i) => {
    label.visible = i === index;
  });
}
