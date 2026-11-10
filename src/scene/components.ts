// Scene-level tags. System-free on purpose (AGENTS.md).
import { createComponent } from '@iwsdk/core';

/** The pad shown on a detected table. A pinch (ray) or a poke on it confirms. */
export const PlacementPad = createComponent('PlacementPad', {});
/** Table-edge Re-centre button (docs/04 section 7). */
export const RecentreButton = createComponent('RecentreButton', {});
