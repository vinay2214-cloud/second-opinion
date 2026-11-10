import { safeStorage, type SafeStorage } from './safeStorage.js';

export interface Settings {
  highContrast: boolean;
  calm: boolean;
  oneHand: boolean;
  gazeDwell: boolean;
  dwellSeconds: number;
  textScale: number;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  highContrast: false,
  calm: false,
  oneHand: false,
  gazeDwell: false,
  dwellSeconds: 1.2,
  textScale: 1,
});

const KEY = 'so.settings';

function normalize(value: unknown): Settings {
  const record = value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const flag = (key: keyof Settings): boolean => typeof record[key] === 'boolean' ? record[key] as boolean : false;
  const number = (key: 'dwellSeconds' | 'textScale', min: number, max: number): number => {
    const v = record[key];
    return typeof v === 'number' && Number.isFinite(v)
      ? Math.max(min, Math.min(max, v)) : DEFAULT_SETTINGS[key];
  };
  return {
    highContrast: flag('highContrast'),
    calm: flag('calm'),
    oneHand: flag('oneHand'),
    gazeDwell: flag('gazeDwell'),
    // Ranges from docs/04-interaction-and-accessibility-spec.md, section 4.
    dwellSeconds: number('dwellSeconds', 0.8, 2),
    textScale: number('textScale', 1, 1.25),
  };
}

/** Returns an independent validated value; malformed JSON uses defaults. */
export function loadSettings(storage: SafeStorage = safeStorage): Settings {
  try {
    const raw = storage.get(KEY);
    return normalize(raw === null ? null : JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Merge a partial update into saved settings, clamp it, and return the saved value. */
export function saveSettings(patch: Partial<Settings>, storage: SafeStorage = safeStorage): Settings {
  let settings = loadSettings(storage);
  try {
    settings = normalize({ ...settings, ...patch });
    storage.set(KEY, JSON.stringify(settings));
  } catch { /* Return usable settings even if a supplied storage adapter fails. */ }
  return settings;
}
