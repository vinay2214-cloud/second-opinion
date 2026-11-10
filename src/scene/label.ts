// Flat text labels drawn with the 2D canvas API (docs/03 section 7 fallback).
import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from '@iwsdk/core';

export interface LabelOptions {
  /** Label width and height in metres. */
  width: number;
  height: number;
  color?: string;
  background?: string;
  bold?: boolean;
}

/** A label lying flat on a surface, readable from the player's side (+Z). */
export function createFlatLabel(text: string, options: LabelOptions): Mesh {
  const pxPerMetre = 4000;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(options.width * pxPerMetre));
  canvas.height = Math.max(16, Math.round(options.height * pxPerMetre));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (options.background) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = options.color ?? '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fontPx = Math.round(canvas.height * 0.72);
    const weight = options.bold === false ? '500' : '700';
    ctx.font = `${weight} ${fontPx}px system-ui, sans-serif`;
    const maxWidth = canvas.width * 0.92;
    const measured = ctx.measureText(text).width;
    if (measured > maxWidth) {
      fontPx = Math.floor((fontPx * maxWidth) / measured);
      ctx.font = `${weight} ${fontPx}px system-ui, sans-serif`;
    }
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + fontPx * 0.04);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    new PlaneGeometry(options.width, options.height),
    new MeshBasicMaterial({ map: texture, transparent: !options.background }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = `Label ${text}`;
  return mesh;
}
