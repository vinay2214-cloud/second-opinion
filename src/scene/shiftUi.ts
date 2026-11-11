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
import type { ToggleKey } from '../access/access.js';
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
  labels: Object3D[];
}

export interface ShiftUiParts {
  card: TextPanel;
  speech: TextPanel;
  debrief: TextPanel;
  /** labels: Keep (during a shift), Map and Review (on the debrief). */
  keep: ButtonParts;
  /** One start button per module, left to right: Module 1, 2, 3. */
  starts: ButtonParts[];
  /** labels[0] = "Pause", labels[1] = "Resume". */
  pause: ButtonParts;
  /** Opens the settings row. labels[0] = "Menu", labels[1] = "Close". */
  settings: ButtonParts;
  /** Shown in place of the card while settings are open. labels[0] = off, labels[1] = on. */
  toggles: Array<{ key: ToggleKey; parts: ButtonParts }>;
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
  // A text may hold two rows ("name\nstate"); each row is its own flat label.
  const labels = texts.map((text, i) => {
    const rows = text.split('\n');
    const rowDepth = Math.min((depth * 0.92) / rows.length, 0.024);
    const group = new Group();
    rows.forEach((row, r) => {
      const label = createFlatLabel(row, {
        width: width * 0.94,
        height: rowDepth,
        color: PALETTE.text,
      });
      label.position.z = (r - (rows.length - 1) / 2) * rowDepth;
      group.add(label);
    });
    group.position.y = 0.0145;
    group.visible = i === 0;
    root.add(group);
    return group;
  });
  return { root, cap, labels };
}

const SPEECH_TILT = (15 * Math.PI) / 180;
const SPEECH_BASE_Y = 0.075;
const DEBRIEF_TILT = (25 * Math.PI) / 180;
const DEBRIEF_BASE_Y = 0.037;

/** Large text: the two far panels grow about their bottom edge, so nothing on the table moves. */
export function scalePanels(ui: ShiftUiParts, scale: number): void {
  ui.speech.mesh.scale.setScalar(scale);
  ui.speech.mesh.position.y = SPEECH_BASE_Y + 0.16 * scale * Math.cos(SPEECH_TILT);
  ui.debrief.mesh.scale.setScalar(scale);
  ui.debrief.mesh.position.y = DEBRIEF_BASE_Y + 0.2 * scale * Math.cos(DEBRIEF_TILT);
}

const TOGGLES: Array<{ key: ToggleKey; label: string }> = [
  { key: 'highContrast', label: 'Contrast' },
  { key: 'calm', label: 'Calm' },
  { key: 'largeText', label: 'Big text' },
  { key: 'tutorial', label: 'Tutorial' },
];

export function buildShiftUi(): ShiftUiParts {
  const card = createTextPanel('Vitals Card', 0.34, 0.11);
  // Lies on the near edge, raised 20 degrees so it faces a seated player
  // without hiding the tray labels behind it.
  card.mesh.rotation.x = -Math.PI / 2 + (20 * Math.PI) / 180;
  card.mesh.position.set(-0.035, 0.026, 0.131);
  card.mesh.visible = false;

  const speech = createTextPanel('Speech Panel', 0.56, 0.32);
  speech.mesh.rotation.x = -SPEECH_TILT;
  speech.mesh.position.set(0, SPEECH_BASE_Y + 0.16 * Math.cos(SPEECH_TILT), -0.225);

  const debrief = createTextPanel('Debrief Panel', 0.56, 0.4);
  debrief.mesh.rotation.x = -DEBRIEF_TILT;
  debrief.mesh.position.set(0, DEBRIEF_BASE_Y + 0.2 * Math.cos(DEBRIEF_TILT), -0.1);
  debrief.mesh.visible = false;

  const keep = button('Keep Button', 0.045, 0.045, ['Keep', 'Map', 'Review'], PALETTE.button);
  keep.root.position.set(0.19, 0.005, 0.098);

  // Where the card will be; only shown before the first patient. 9 cm wide, 2 cm gaps.
  const starts = [1, 2, 3].map((n, i) => {
    const parts = button(`Start Module ${n}`, 0.09, 0.05, [`Module ${n}`], PALETTE.keepOn);
    parts.root.position.set(-0.145 + i * 0.11, 0.005, 0.13);
    return parts;
  });

  // Settings row, same place: four toggles, 7 cm wide, 2 cm gaps.
  const toggles = TOGGLES.map(({ key, label }, i) => {
    const parts = button(`Toggle ${label}`, 0.074, 0.05, [`${label}\noff`, `${label}\nON`], PALETTE.button);
    parts.root.position.set(-0.1705 + i * 0.094, 0.005, 0.13);
    return { key, parts };
  });
  const settings = button('Settings Button', 0.045, 0.04, ['Menu', 'Close'], PALETTE.button);
  settings.root.position.set(0.2575, 0.005, 0.09);

  const pause = button('Pause Button', 0.045, 0.045, ['Pause', 'Resume'], PALETTE.button);
  pause.root.position.set(-0.25, 0.005, 0.15);

  return { card, speech, debrief, keep, starts, pause, settings, toggles };
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
 * Drift cue: a small two-line 'update installed' tag on the rail in front of
 * an advisor's name (docs/02 section 7). Quiet by design: capitals about
 * 1.05 cm tall, a little under the usual text rule.
 */
export function buildDriftBadge(plinth: Object3D, text: string): Group {
  const badge = new Group();
  const words = text.split(' ');
  const half = Math.ceil(words.length / 2);
  const row = 0.021;
  [words.slice(0, half).join(' '), words.slice(half).join(' ')].forEach((line, i) => {
    const label = createFlatLabel(line, {
      width: 0.088,
      height: row,
      color: '#0b1220',
      background: '#c9d6ea',
    });
    label.position.z = (i - 0.5) * row;
    badge.add(label);
  });
  // Flat on the floor in the 4 cm strip between the name label and the trays,
  // so it hides neither the name nor the speech panel.
  badge.position.set(0, 0.002, 0.076);
  badge.visible = false;
  plinth.add(badge);
  return badge;
}

export function showButtonLabel(parts: ButtonParts, index: number): void {
  parts.labels.forEach((label, i) => {
    label.visible = i === index;
  });
}
