// Game-lane ECS components. System-free on purpose (AGENTS.md).
// Adapters only: these hold presentation state, never scores or rules.
import { createComponent, Types } from '@iwsdk/core';
import type { Zone } from '../scene/config.js';

/** A patient token. `state` is 'lane' | 'held' | 'tray' | 'done'; `zone` is set while on a tray. */
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

/** The vitals card. Poke (or pinch-ray) toggles the expanded view. */
export const VitalsCard = createComponent('VitalsCard', {});
/** An advisor plinth. Poke it to ask that advisor for a second opinion. */
export const AdvisorPlinth = createComponent('AdvisorPlinth', {
  advisorId: { type: Types.String, default: '' },
});
/** Start button for one module (1 to 3), shown before the first patient. */
export const StartButton = createComponent('StartButton', {
  module: { type: Types.Int32, default: 1 },
});
/** Pause / Resume button on the table edge. */
export const PauseButton = createComponent('PauseButton', {});
/** Opens and closes the settings row. */
export const SettingsButton = createComponent('SettingsButton', {});
/** One accessibility toggle in the settings row. `key` is a ToggleKey. */
export const SettingToggle = createComponent('SettingToggle', {
  key: { type: Types.String, default: '' },
});
/** Keep button: confirms the committed call. */
export const KeepButton = createComponent('KeepButton', {});
/** Ask the coach: optional, shown on the debrief only when a proxy URL was built in (T17). */
export const CoachButton = createComponent('CoachButton', {});
