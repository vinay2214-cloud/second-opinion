// A flat panel with wrapped text, drawn with the 2D canvas API (docs/03
// section 7 fallback). It only draws the strings it is given; it never reads
// game state. Redraws happen only when the content changes.
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
}

export interface TextPanel {
  mesh: Mesh;
  /** Draw these lines. `key` identifies the content; an unchanged key skips the redraw. */
  set(key: string, lines: readonly PanelLine[]): void;
}

const PX_PER_M = 3000;
export const BODY_EM = 0.017;

export function createTextPanel(
  name: string,
  width: number,
  height: number,
  background = '#0c1626',
  border = '#5b7db8',
): TextPanel {
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
    if (key === lastKey || !ctx) {
      return;
    }
    lastKey = key;
    ctx.fillStyle = border;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = background;
    ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxWidth = canvas.width - pad * 2;
    let y = pad;
    for (const line of lines) {
      const px = Math.round((line.em ?? BODY_EM) * PX_PER_M);
      ctx.font = `${line.bold ? '700' : '500'} ${px}px system-ui, sans-serif`;
      ctx.fillStyle = line.color ?? '#f2f6ff';
      let row = '';
      for (const word of line.text.split(' ')) {
        const next = row ? `${row} ${word}` : word;
        if (row && ctx.measureText(next).width > maxWidth) {
          ctx.fillText(row, pad, y);
          y += Math.round(px * 1.28);
          row = word;
        } else {
          row = next;
        }
      }
      ctx.fillText(row, pad, y);
      y += Math.round(px * 1.34);
    }
    texture.needsUpdate = true;
  }

  return { mesh, set };
}
