// Game-lane ECS components. System-free on purpose (AGENTS.md).
// Adapters only: these hold presentation state, never scores or rules.
import { createComponent, Types } from '@iwsdk/core';
import type { Zone } from '../scene/config.js';

/** A patient token. `state` is 'lane' | 'held' | 'tray'; `zone` is set while on a tray. */
export const Token = createComponent('Token', {
  index: { type: Types.Int32, default: 0 },
  state: { type: Types.String, default: 'lane' },
  zone: { type: Types.String, default: '' },
});

/** A Red / Amber / Green tray. */
export const Tray = createComponent('Tray', {
  zone: { type: Types.String, default: '' },
});

/** What the player asked for. T06 forwards this to the runtime; nothing here decides anything. */
export interface TokenIntent {
  type: 'place';
  tokenId: number;
  zone: Zone;
}
