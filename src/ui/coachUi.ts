// "Ask the coach" (T17, docs/12 section 2): the optional button, its thinking
// ring and the text of the coach card. Geometry and strings only. The text
// shown is always a CoachText from askCoach (chooseCoachText or the template);
// nothing here talks to the network or reads game state.
import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
} from '@iwsdk/core';
import type { CoachText } from '../core/coach.js';
import { coachConfig } from '../core/data.js';
import { createFlatLabel } from '../scene/label.js';
import { PALETTE } from '../scene/palette.js';
import { TEXT_EM } from '../scene/shiftUi.js';
import type { PanelLine } from './TextPanel.js';

export interface CoachUi {
  root: Group;
  cap: MeshLambertMaterial;
  /** Open ring above the button; turned by ShiftSystem while a reply is pending. */
  ring: Mesh;
}

const WIDTH = 0.074;
const DEPTH = 0.048;

/**
 * Table edge, left, above Pause (mirrors Menu on the right). Same size and
 * label rows as the settings toggles; 2 cm clear of Pause. Shown only on the
 * debrief, when the lane under it is empty.
 */
export function buildCoachButton(): CoachUi {
  const root = new Group();
  root.name = 'Coach Button';
  const cap = new MeshLambertMaterial({ color: PALETTE.keepOn });
  const box = new Mesh(new BoxGeometry(WIDTH, 0.014, DEPTH), cap);
  box.position.y = 0.007;
  root.add(box);
  const rows = ['Ask the', 'coach'];
  const rowDepth = (DEPTH * 0.92) / rows.length;
  rows.forEach((row, r) => {
    const label = createFlatLabel(row, { width: WIDTH * 0.94, height: rowDepth, color: PALETTE.text });
    label.position.set(0, 0.0145, (r - (rows.length - 1) / 2) * rowDepth);
    root.add(label);
  });
  // Three quarters of a circle, so its turning is visible. Opaque: safe mode needs no change.
  const ring = new Mesh(
    new RingGeometry(0.026, 0.032, 24, 1, 0, Math.PI * 1.5),
    new MeshBasicMaterial({ color: PALETTE.accent, side: DoubleSide }),
  );
  ring.name = 'Coach Thinking Ring';
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.visible = false;
  root.add(ring);
  root.position.set(-0.26, 0.005, 0.082);
  return { root, cap, ring };
}

/** Extra lines under the template debrief when the coach is available. */
export function coachOfferLines(): PanelLine[] {
  const em = TEXT_EM.debrief;
  return [
    { text: 'Poke Map for your trust map, Ask the coach, or a module to play again.', em, color: '#9ec1ff' },
    { text: `Ask the coach: ${coachConfig.consentNotice}`, em, color: '#ffd166' },
  ];
}

/** The coach card, drawn on the debrief panel. `result` null means the reply is pending. */
export function coachLines(result: CoachText | null, phase: number): PanelLine[] {
  const em = TEXT_EM.debrief;
  const head = TEXT_EM.debriefHead;
  const back: PanelLine = { text: 'Poke Back for your shift review.', em, color: '#9ec1ff' };
  if (!result) {
    return [
      { text: 'Coach (AI)', bold: true, em: head },
      { text: `Coach is thinking${'.'.repeat(1 + (phase % 3))}`, em, color: '#ffd166' },
      back,
    ];
  }
  if (result.source === 'coach') {
    return [{ text: 'Coach (AI)', bold: true, em: head }, { text: result.text, em }, back];
  }
  return [
    { text: 'Coach', bold: true, em: head },
    { text: coachConfig.offlineNotice, em, color: '#ffd166' },
    { text: result.text, em },
    back,
  ];
}
