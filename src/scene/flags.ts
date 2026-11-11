// URL options for remote testers (T14):
//   ?debug=1  in-world overlay: frame rate, tracking state, last error, build tag
//   ?safe=1   no transparency, so a device with blending trouble still shows everything
// DEV_FORCE lets the emulator test them (its CLI cannot open a URL with a query).
// It is ignored in production builds; keep both values false when committing.
import type { Object3D } from '@iwsdk/core';

const DEV_FORCE = { debug: false, safe: false };

const query = new URLSearchParams(window.location.search);
const dev = import.meta.env.DEV;
export const DEBUG = query.get('debug') === '1' || (dev && DEV_FORCE.debug);
export const SAFE = query.get('safe') === '1' || (dev && DEV_FORCE.safe);
/** Shown by the debug overlay so a tester's screenshot identifies the build. */
export const BUILD_TAG = 'gate2+t14';

interface MaterialLike {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  needsUpdate: boolean;
}

/** Safe mode: make every material under `root` opaque. Call after building an object. */
export function makeOpaque(root: Object3D): void {
  if (!SAFE) {
    return;
  }
  root.traverse((node) => {
    const material = (node as { material?: MaterialLike | MaterialLike[] }).material;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      if (m.transparent) {
        m.transparent = false;
        m.opacity = 1;
        m.depthWrite = true;
        m.needsUpdate = true;
      }
    }
  });
}
