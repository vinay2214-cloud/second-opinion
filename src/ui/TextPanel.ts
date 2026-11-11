// A flat panel with wrapped text, drawn with the 2D canvas API (docs/03
// section 7 fallback). It only draws the strings it is given; it never reads
// game state. Redraws happen only when the content changes.
import { access } from '../access/access.js';
import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from '@iwsdk/core';

export interface PanelLine {
  text: string;
  /** Font size (em) in metres. Default 1.7 cm, which keeps capitals about 1.2 cm tall. */
  em?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface TextPanel {
  mesh: Mesh;
  /** Draw these lines. `key` identifies the content; an unchanged key skips the redraw. */
  set(key: string, lines: readonly PanelLine[]): void;
}

/** Canvas resolution, capped so no texture side exceeds 1024 px (docs/03 section 8). */
const MAX_PX_PER_M = 3000;
const MAX_TEXTURE_PX = 1024;
export const BODY_EM = 0.017;

export function createTextPanel(
  name: string,
  width: number,
  height: number,
  background = '#0c1626',
  border = '#5b7db8',
): TextPanel {
  const PX_PER_M = Math.min(MAX_PX_PER_M, MAX_TEXTURE_PX / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * PX_PER_M);
  canvas.height = Math.round(height * PX_PER_M);
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(width, height),
    new MeshBasicMaterial({ map: texture }),
  );
  mesh.name = name;
  let lastKey = '';
  const pad = Math.round(0.008 * PX_PER_M);

  function set(key: string, lines: readonly PanelLine[]): void {
    // Theme changes (high contrast) must redraw, so the theme version is part of the key.
    const themed = `${access.version}|${key}`;
    if (themed === lastKey || !ctx) {
      return;
    }
    lastKey = themed;
    const contrast = access.settings.highContrast;
    ctx.fillStyle = contrast ? '#ffffff' : border;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = contrast ? '#000000' : background;
    const edge = contrast ? 10 : 4; // thicker outline in high contrast
    ctx.fillRect(edge, edge, canvas.width - edge * 2, canvas.height - edge * 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxWidth = canvas.width - pad * 2;
    // Lay out once to measure; if the text would overflow, shrink everything
    // to fit and say so in the console (it breaks the text-size rule).
    let scale = 1;
    for (let pass = 0; pass < 2; pass++) {
      let y = pad;
      for (const line of lines) {
        const px = Math.round((line.em ?? BODY_EM) * PX_PER_M * scale);
        ctx.font = `${line.italic ? 'italic ' : ''}${line.bold ? '700' : '500'} ${px}px system-ui, sans-serif`;
        ctx.fillStyle = line.color ?? '#f2f6ff';
        let row = '';
        for (const word of line.text.split(' ')) {
          const next = row ? `${row} ${word}` : word;
          if (row && ctx.measureText(next).width > maxWidth) {
            if (pass === 1) ctx.fillText(row, pad, y);
            y += Math.round(px * 1.28);
            row = word;
          } else {
            row = next;
          }
        }
        if (pass === 1) ctx.fillText(row, pad, y);
        y += Math.round(px * 1.34);
      }
      if (pass === 0) {
        if (y > canvas.height - pad) {
          scale = (canvas.height - pad * 2) / (y - pad);
          if (scale < 0.97) {
            console.warn(`[ui] ${name}: text shrunk to ${Math.round(scale * 100)}% to fit`);
          }
        }
      }
    }
    texture.needsUpdate = true;
  }

  return { mesh, set };
}
