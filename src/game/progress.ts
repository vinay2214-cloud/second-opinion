// Module progress (T08): which modules are unlocked. Stored through the
// T05 safe storage under this module's own key; this file owns the JSON
// validation. A finished shift unlocks the next module.
import { safeStorage } from '../persist/safeStorage.js';
import type { ModuleId } from '../core/index.js';

const KEY = 'so.progress';
export const MODULE_ORDER: readonly ModuleId[] = ['module1', 'module2', 'module3'];

/** Highest unlocked module number, 1 to 3. Malformed or missing data gives 1. */
export function loadUnlocked(): number {
  try {
    const raw = safeStorage.get(KEY);
    const value = raw === null ? null : (JSON.parse(raw) as { unlocked?: unknown });
    const n = value && typeof value.unlocked === 'number' ? Math.floor(value.unlocked) : 1;
    return Math.min(MODULE_ORDER.length, Math.max(1, Number.isFinite(n) ? n : 1));
  } catch {
    return 1;
  }
}

/** Record that a module's shift was finished; returns the new unlocked level. */
export function recordFinished(module: ModuleId): number {
  const next = Math.min(MODULE_ORDER.length, MODULE_ORDER.indexOf(module) + 2);
  const unlocked = Math.max(loadUnlocked(), next);
  try {
    safeStorage.set(KEY, JSON.stringify({ unlocked }));
  } catch {
    /* safeStorage already falls back to memory; never interrupt the debrief. */
  }
  return unlocked;
}
