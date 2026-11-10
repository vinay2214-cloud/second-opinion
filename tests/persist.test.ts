import { afterEach, describe, expect, test, vi } from 'vitest';
import { createSafeStorage, safeStorage, type SafeStorage, type StorageBackend } from '../src/persist/safeStorage.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/persist/settings.js';
import { loadHistory, recordShift, type ShiftSummary } from '../src/persist/history.js';

class MemoryBackend implements StorageBackend {
  readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const setup = () => {
  const backend = new MemoryBackend();
  return { backend, storage: createSafeStorage(() => backend) };
};
const fail = (): never => { throw new Error('Storage denied'); };
const emptyHistory = { entries: [], streak: 0, lastPlayedDate: null };
const result = { index: 75, score: 42 };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('safeStorage', () => {
  test('round-trips raw strings, enumerates, removes, and persists between instances', () => {
    const { backend, storage } = setup();
    expect(storage.get('missing')).toBeNull();
    storage.set('a', 'one');
    storage.set('empty', '');
    const reloaded = createSafeStorage(() => backend);
    expect(reloaded.get('a')).toBe('one');
    expect(reloaded.get('empty')).toBe('');
    expect(reloaded.all()).toEqual({ a: 'one', empty: '' });
    reloaded.remove('a');
    expect(storage.get('a')).toBeNull();
    expect(storage.all()).toEqual({ empty: '' });
  });

  test.each([undefined, null])('uses memory when storage is %s', (missing) => {
    const storage = createSafeStorage(() => missing);
    expect(storage.get('a')).toBeNull();
    expect(storage.all()).toEqual({});
    storage.set('a', 'one');
    expect(storage.get('a')).toBe('one');
    expect(storage.all()).toEqual({ a: 'one' });
    storage.remove('a');
    expect(storage.get('a')).toBeNull();
    expect(storage.all()).toEqual({});
  });

  test('the browser storage getter can throw without breaking the shared default instance', () => {
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: fail });
    expect(() => createSafeStorage()).not.toThrow();
    safeStorage.set('so.tutorialDone', 'true');
    expect(safeStorage.get('so.tutorialDone')).toBe('true');
    expect(safeStorage.all()).toEqual({ 'so.tutorialDone': 'true' });
    safeStorage.remove('so.tutorialDone');
    expect(safeStorage.get('so.tutorialDone')).toBeNull();
  });

  test('a throwing storage resolver is caught for every operation', () => {
    const resolve = vi.fn(fail);
    const storage = createSafeStorage(resolve);
    expect(storage.get('a')).toBeNull();
    storage.set('a', 'one');
    expect(storage.get('a')).toBe('one');
    expect(storage.all()).toEqual({ a: 'one' });
    storage.remove('a');
    expect(storage.all()).toEqual({});
    expect(resolve).toHaveBeenCalledTimes(5);
  });

  test('reads fall back to the last known value when getItem throws', () => {
    const { backend, storage } = setup();
    backend.setItem('a', 'saved');
    expect(storage.get('a')).toBe('saved');
    const read = vi.spyOn(backend, 'getItem').mockImplementation(fail);
    expect(storage.get('a')).toBe('saved');
    expect(storage.get('unknown')).toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
  });

  test('quota errors keep new values authoritative even after reads recover', () => {
    const { backend, storage } = setup();
    backend.setItem('a', 'old');
    expect(storage.get('a')).toBe('old');
    const write = vi.spyOn(backend, 'setItem').mockImplementation(() => {
      throw Object.assign(new Error('Full'), { name: 'QuotaExceededError' });
    });
    storage.set('a', 'new');
    storage.set('b', 'new key');
    expect(backend.getItem('a')).toBe('old');
    expect(storage.get('a')).toBe('new');
    expect(storage.all()).toEqual({ a: 'new', b: 'new key' });
    write.mockRestore();
    expect(storage.get('a')).toBe('new');
    storage.set('a', 'saved again');
    expect(createSafeStorage(() => backend).get('a')).toBe('saved again');
  });

  test('failed removals cannot resurrect stale persistent values', () => {
    const { backend, storage } = setup();
    storage.set('a', 'old');
    const remove = vi.spyOn(backend, 'removeItem').mockImplementation(fail);
    storage.remove('a');
    expect(backend.getItem('a')).toBe('old');
    expect(storage.get('a')).toBeNull();
    expect(storage.all()).toEqual({});
    remove.mockRestore();
    expect(storage.get('a')).toBeNull();
    storage.remove('a');
    expect(createSafeStorage(() => backend).all()).toEqual({});
  });

  test.each(['length', 'key', 'getItem'] as const)('enumeration failure in %s preserves the complete cached snapshot', (operation) => {
    const { backend, storage } = setup();
    storage.set('a', 'one');
    storage.set('b', 'two');
    expect(storage.all()).toEqual({ a: 'one', b: 'two' });
    if (operation === 'length') vi.spyOn(backend, 'length', 'get').mockImplementation(fail);
    else if (operation === 'key') vi.spyOn(backend, 'key').mockReturnValueOnce('a').mockImplementation(fail);
    else vi.spyOn(backend, 'getItem').mockReturnValueOnce('one').mockImplementation(fail);
    expect(storage.all()).toEqual({ a: 'one', b: 'two' });
  });

  test('a readable backend reflects external edits without losing pending local changes', () => {
    const { backend, storage } = setup();
    storage.set('old', 'one');
    const write = vi.spyOn(backend, 'setItem').mockImplementation(fail);
    storage.set('pending', 'two');
    write.mockRestore();
    backend.removeItem('old');
    backend.setItem('external', 'three');
    expect(storage.all()).toEqual({ pending: 'two', external: 'three' });
    expect(storage.get('old')).toBeNull();
  });

  test('all returns detached data and handles special property names', () => {
    const storage = createSafeStorage(() => null);
    storage.set('__proto__', 'value');
    const snapshot = storage.all();
    expect(Object.prototype.hasOwnProperty.call(snapshot, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    snapshot['__proto__'] = 'changed';
    expect(storage.get('__proto__')).toBe('value');
  });
});

describe('settings', () => {
  test('defaults are exact and each load returns an independent value', () => {
    const storage = createSafeStorage(() => null);
    expect(loadSettings(storage)).toEqual({ highContrast: false, calm: false, oneHand: false, gazeDwell: false, dwellSeconds: 1.2, textScale: 1 });
    const loaded = loadSettings(storage);
    loaded.calm = true;
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.calm).toBe(false);
  });

  test('partial updates preserve other settings across a fresh storage instance', () => {
    const { backend, storage } = setup();
    saveSettings({ highContrast: true, oneHand: true }, storage);
    const next = saveSettings({ calm: true, gazeDwell: true, dwellSeconds: 1.7, textScale: 1.25 }, storage);
    expect(next).toEqual({ highContrast: true, oneHand: true, calm: true, gazeDwell: true, dwellSeconds: 1.7, textScale: 1.25 });
    expect(loadSettings(createSafeStorage(() => backend))).toEqual(next);
    next.calm = false;
    expect(loadSettings(storage).calm).toBe(true);
  });

  test.each(['{broken', '', 'null', '[]', '42', '"text"'])('corrupted or wrong-shaped JSON %s uses defaults', (raw) => {
    const { storage } = setup();
    storage.set('so.settings', raw);
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  test('stored and saved out-of-range values are clamped to documented limits', () => {
    const { storage } = setup();
    storage.set('so.settings', JSON.stringify({ dwellSeconds: -5, textScale: 50 }));
    expect(loadSettings(storage)).toEqual({ ...DEFAULT_SETTINGS, dwellSeconds: 0.8, textScale: 1.25 });
    expect(saveSettings({ dwellSeconds: 50, textScale: -2 }, storage)).toEqual({ ...DEFAULT_SETTINGS, dwellSeconds: 2, textScale: 1 });
  });

  test('wrong types and non-finite numbers are rejected without coercion', () => {
    const { storage } = setup();
    storage.set('so.settings', JSON.stringify({ highContrast: 'true', calm: 1, oneHand: null, gazeDwell: [], dwellSeconds: '1.5', textScale: null, extra: 'ignored' }));
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ dwellSeconds: Infinity, textScale: NaN }, storage)).toEqual(DEFAULT_SETTINGS);
    expect(Object.keys(loadSettings(storage)).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });

  test('default functions share the lazy memory fallback when localStorage is missing', () => {
    vi.stubGlobal('localStorage', undefined);
    saveSettings({ calm: true });
    expect(loadSettings().calm).toBe(true);
    safeStorage.remove('so.settings');
  });
});

describe('history', () => {
  test('starts empty and stores only index, score, and caller-supplied local date', () => {
    const { backend, storage } = setup();
    expect(loadHistory(storage)).toEqual(emptyHistory);
    const summary = { index: null, score: -15, ignored: 'not stored' };
    const saved = recordShift(summary, '2026-11-10', storage);
    expect(saved).toEqual({ entries: [{ index: null, score: -15, date: '2026-11-10' }], streak: 1, lastPlayedDate: '2026-11-10' });
    expect(loadHistory(createSafeStorage(() => backend))).toEqual(saved);
  });

  test('multiple shifts on one day count once; consecutive days advance; a gap resets', () => {
    const { storage } = setup();
    expect(recordShift(result, '2026-11-10', storage).streak).toBe(1);
    expect(recordShift(result, '2026-11-10', storage).streak).toBe(1);
    expect(recordShift(result, '2026-11-11', storage).streak).toBe(2);
    expect(recordShift(result, '2026-11-13', storage).streak).toBe(1);
    expect(recordShift(result, '2026-11-14', storage).streak).toBe(2);
  });

  test.each([
    ['2026-12-31', '2027-01-01'],
    ['2026-04-30', '2026-05-01'],
    ['2028-02-28', '2028-02-29', '2028-03-01'],
    ['2100-02-28', '2100-03-01'],
    ['2000-02-28', '2000-02-29', '2000-03-01'],
  ])('calendar boundaries work starting at %s', (...days) => {
    const { storage } = setup();
    days.forEach((day, i) => expect(recordShift(result, day, storage).streak).toBe(i + 1));
  });

  test('backdated results are retained without rewinding or advancing the streak', () => {
    const { storage } = setup();
    recordShift(result, '2026-11-10', storage);
    recordShift(result, '2026-11-11', storage);
    const backdated = recordShift(result, '2026-11-09', storage);
    expect(backdated.entries).toHaveLength(3);
    expect(backdated.streak).toBe(2);
    expect(backdated.lastPlayedDate).toBe('2026-11-11');
    expect(recordShift(result, '2026-11-12', storage).streak).toBe(3);
  });

  test('invalid days and results are ignored without changing storage', () => {
    const { storage } = setup();
    const before = recordShift(result, '2026-11-10', storage);
    for (const day of ['', '2026-2-01', '2026-02-29', '2100-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-11-00', '0000-01-01', '2026-11-10\n']) {
      expect(recordShift(result, day, storage)).toEqual(before);
    }
    for (const summary of [{ index: -1, score: 0 }, { index: 101, score: 0 }, { index: NaN, score: 0 }, { index: 50, score: Infinity }]) {
      expect(recordShift(summary, '2026-11-11', storage)).toEqual(before);
    }
    expect(loadHistory(storage)).toEqual(before);
  });

  test('keeps exactly the newest 30 results and preserves a longer streak', () => {
    const { backend, storage } = setup();
    for (let i = 0; i < 40; i++) {
      const month = i < 30 ? '11' : '12';
      const day = String(i < 30 ? i + 1 : i - 29).padStart(2, '0');
      recordShift({ index: i, score: i * 2 }, '2026-' + month + '-' + day, storage);
    }
    const history = loadHistory(createSafeStorage(() => backend));
    expect(history.entries).toHaveLength(30);
    expect(history.entries[0]).toEqual({ index: 39, score: 78, date: '2026-12-10' });
    expect(history.entries[29]).toEqual({ index: 10, score: 20, date: '2026-11-11' });
    expect(history.streak).toBe(40);
    expect(history.lastPlayedDate).toBe('2026-12-10');
  });

  test('loading also caps oversized stored history and filters invalid entries', () => {
    const { storage } = setup();
    const entries: ShiftSummary[] = Array.from({ length: 35 }, (_, i) => ({ index: i, score: i, date: '2026-11-10' }));
    storage.set('so.history', JSON.stringify({ entries: [null, { index: 900, score: 0, date: 'bad' }, ...entries], streak: 1, lastPlayedDate: '2026-11-10' }));
    const history = loadHistory(storage);
    expect(history.entries).toEqual(entries.slice(0, 30));
    expect(history.streak).toBe(1);
  });

  test('bad streak metadata is rebuilt from valid distinct dates', () => {
    const { storage } = setup();
    storage.set('so.history', JSON.stringify({ entries: [
      { ...result, date: '2026-11-11' }, { ...result, date: '2026-11-11' }, { ...result, date: '2026-11-10' },
    ], streak: -20, lastPlayedDate: 'invalid' }));
    expect(loadHistory(storage)).toMatchObject({ streak: 2, lastPlayedDate: '2026-11-11' });
  });

  test.each(['{broken', 'null', '[]', '42', '{"entries":"wrong"}'])('corrupt history %s loads empty', (raw) => {
    const { storage } = setup();
    storage.set('so.history', raw);
    expect(loadHistory(storage)).toEqual(emptyHistory);
    expect(recordShift(result, '2026-11-10', storage).streak).toBe(1);
  });

  test('returned history cannot mutate the persisted snapshot', () => {
    const { storage } = setup();
    const history = recordShift(result, '2026-11-10', storage);
    history.entries[0].score = 999;
    history.entries.push({ ...result, date: '2026-11-11' });
    expect(loadHistory(storage)).toEqual({ entries: [{ ...result, date: '2026-11-10' }], streak: 1, lastPlayedDate: '2026-11-10' });
  });
});

describe('failure isolation', () => {
  test.each(['missing', 'denied', 'quota'] as const)('settings and history remain usable when storage is %s', (mode) => {
    const backend = new MemoryBackend();
    if (mode === 'quota') vi.spyOn(backend, 'setItem').mockImplementation(fail);
    const storage = createSafeStorage(() => mode === 'missing' ? undefined : mode === 'denied' ? fail() : backend);
    expect(() => {
      saveSettings({ oneHand: true }, storage);
      recordShift(result, '2026-11-10', storage);
      recordShift(result, '2026-11-11', storage);
    }).not.toThrow();
    expect(loadSettings(storage).oneHand).toBe(true);
    expect(loadHistory(storage)).toMatchObject({ streak: 2, lastPlayedDate: '2026-11-11' });
    expect(loadHistory(storage).entries).toHaveLength(2);
  });

  test('public settings/history functions also contain exceptions from a custom adapter', () => {
    const broken: SafeStorage = { get: fail, set: fail, remove: fail, all: fail };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings({ calm: true }, broken).calm).toBe(true);
    expect(loadHistory(broken)).toEqual(emptyHistory);
    expect(recordShift(result, '2026-11-10', broken)).toMatchObject({ streak: 1 });
  });

  test('throwing caller getters do not interrupt settings or result recording', () => {
    const storage = createSafeStorage(() => null);
    const patch = { get calm(): boolean { return fail(); } };
    const summary = { get index(): number { return fail(); }, score: 10 };
    expect(saveSettings(patch, storage)).toEqual(DEFAULT_SETTINGS);
    expect(recordShift(summary, '2026-11-10', storage)).toEqual(emptyHistory);
  });
});
