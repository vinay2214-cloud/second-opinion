// Accessibility state for the scene lane. Settings are loaded and saved
// through src/persist (validated there). This file also owns one small key of
// its own, 'so.tutorial', for the first-completion flag (FR-11), and one more,
// 'so.sound', for the sound-off toggle (src/persist settings has no mute field).
import { safeStorage } from '../persist/safeStorage.js';
import { loadSettings, saveSettings, type Settings } from '../persist/settings.js';

export type ToggleKey = 'highContrast' | 'calm' | 'largeText' | 'tutorial' | 'sound';

interface TutorialFlags {
  /** The player finished the tutorial at least once. */
  done: boolean;
  /** The player chose to see it again (only meaningful once done). */
  replay: boolean;
}

const TUTORIAL_KEY = 'so.tutorial';
const SOUND_KEY = 'so.sound';
const LARGE = 1.25;

function loadTutorial(): TutorialFlags {
  try {
    const raw = safeStorage.get(TUTORIAL_KEY);
    const v = raw === null ? null : (JSON.parse(raw) as Partial<TutorialFlags> | null);
    return { done: v?.done === true, replay: v?.replay === true };
  } catch {
    return { done: false, replay: false };
  }
}

function saveTutorial(flags: TutorialFlags): void {
  try {
    safeStorage.set(TUTORIAL_KEY, JSON.stringify(flags));
  } catch {
    /* safeStorage keeps a memory copy; never interrupt play. */
  }
}

/** Sound is on unless the player switched it off. */
function loadSound(): boolean {
  try {
    return safeStorage.get(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveSound(on: boolean): void {
  try {
    safeStorage.set(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* never interrupt play */
  }
}

/** Live accessibility state. `version` changes on every edit so panels redraw. */
export const access = {
  settings: loadSettings() as Settings,
  tutorial: loadTutorial(),
  soundOn: loadSound(),
  version: 0,

  get largeText(): boolean {
    return this.settings.textScale > 1.01;
  },
  get panelScale(): number {
    return this.largeText ? LARGE : 1;
  },
  /** The tutorial plays until finished once; after that only if asked for. */
  get tutorialOn(): boolean {
    return !this.tutorial.done || this.tutorial.replay;
  },

  isOn(key: ToggleKey): boolean {
    if (key === 'largeText') return this.largeText;
    if (key === 'tutorial') return this.tutorialOn;
    if (key === 'sound') return this.soundOn;
    return this.settings[key];
  },

  /** Flip one setting and save it. Returns false if the change is not allowed. */
  toggle(key: ToggleKey): boolean {
    if (key === 'tutorial') {
      if (!this.tutorial.done) return false; // skippable only after first completion
      this.tutorial = { done: true, replay: !this.tutorial.replay };
      saveTutorial(this.tutorial);
    } else if (key === 'sound') {
      this.soundOn = !this.soundOn;
      saveSound(this.soundOn);
    } else if (key === 'largeText') {
      this.settings = saveSettings({ textScale: this.largeText ? 1 : LARGE });
    } else {
      this.settings = saveSettings({ [key]: !this.settings[key] });
    }
    this.version += 1;
    return true;
  },

  tutorialCompleted(): void {
    this.tutorial = { done: true, replay: false };
    saveTutorial(this.tutorial);
    this.version += 1;
  },
};
