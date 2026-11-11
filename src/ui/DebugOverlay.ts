// ?debug=1 overlay (T14): a small panel beside the speech panel with frame
// rate, tracking state, last error and build tag, so a remote tester's
// screenshot carries useful evidence. Registered only when the flag is set.
import { createSystem, VisibilityState } from '@iwsdk/core';
import { BUILD_TAG, SAFE } from '../scene/flags.js';
import { createTextPanel, type TextPanel } from './TextPanel.js';

let lastError = 'none';
/** Start listening as early as possible (called from bootstrap when ?debug=1). */
export function captureErrors(): void {
  window.addEventListener('error', (event) => {
    lastError = String(event.message).slice(0, 90);
  });
  window.addEventListener('unhandledrejection', (event) => {
    lastError = String((event.reason as { message?: string })?.message ?? event.reason).slice(0, 90);
  });
}

export function buildDebugPanel(): TextPanel {
  const panel = createTextPanel('Debug Overlay', 0.3, 0.16, '#1a0f2e', '#b48cff');
  panel.mesh.rotation.set((-15 * Math.PI) / 180, 0.5, 0);
  panel.mesh.position.set(-0.44, 0.17, -0.16);
  return panel;
}

export class DebugOverlay extends createSystem({}) {
  static panel: TextPanel;
  private frames = 0;
  private span = 0;
  private worst = 0;

  update(delta: number): void {
    this.frames += 1;
    this.span += delta;
    this.worst = Math.max(this.worst, delta);
    if (this.span < 1) {
      return;
    }
    const fps = this.frames / this.span;
    const state = this.world.visibilityState.peek();
    const hands: string[] = [];
    const frame = this.renderer.xr.getFrame();
    const space = this.renderer.xr.getReferenceSpace();
    for (const side of ['left', 'right'] as const) {
      const source = this.input.xr.getPrimaryInputSource(side);
      const tracked =
        !!source && !!frame && !!space && !!frame.getPose(source.gripSpace ?? source.targetRaySpace, space);
      hands.push(`${side[0].toUpperCase()}:${!source ? 'none' : tracked ? (source.hand ? 'hand' : 'ctrl') : 'lost'}`);
    }
    const em = 0.0125;
    DebugOverlay.panel.set(`${Math.round(fps)}|${Math.round(this.worst * 1000)}|${hands.join()}|${lastError}|${state}`, [
      { text: `DEBUG ${BUILD_TAG}${SAFE ? ' safe' : ''}`, bold: true, em },
      { text: `${fps.toFixed(0)} fps, worst frame ${(this.worst * 1000).toFixed(0)} ms`, em },
      { text: `Session ${state === VisibilityState.NonImmersive ? 'flat (not in XR)' : state} ${hands.join(' ')}`, em },
      { text: `Last error: ${lastError}`, em, color: lastError === 'none' ? '#f2f6ff' : '#ff8589' },
    ]);
    this.frames = 0;
    this.span = 0;
    this.worst = 0;
  }
}
