/** The part of browser storage used here; injectable without browser globals. */
export interface StorageBackend {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Raw strings, like browser storage. JSON validation belongs to the owning module. */
export interface SafeStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  all(): Record<string, string>;
}

/** Memory is private to this instance and survives storage failures until page reload. */
export function createSafeStorage(
  resolve: () => StorageBackend | null | undefined = () => globalThis.localStorage,
): SafeStorage {
  let memory = new Map<string, string>();
  // Failed writes and removal tombstones must override stale persistent values.
  const pending = new Map<string, string | null>();

  return {
    get(key) {
      try {
        if (pending.has(key)) return pending.get(key) ?? null;
        const storage = resolve();
        if (storage) {
          const value = storage.getItem(key);
          if (value === null) memory.delete(key);
          else memory.set(key, value);
          return value;
        }
      } catch { /* Use the last known value. */ }
      return memory.get(key) ?? null;
    },

    set(key, value) {
      memory.set(key, value);
      pending.set(key, value);
      try {
        const storage = resolve();
        if (storage) {
          storage.setItem(key, value);
          pending.delete(key);
        }
      } catch { /* The value remains authoritative in memory. */ }
    },

    remove(key) {
      memory.delete(key);
      pending.set(key, null);
      try {
        const storage = resolve();
        if (storage) {
          storage.removeItem(key);
          pending.delete(key);
        }
      } catch { /* Keep the tombstone so an old value cannot return. */ }
    },

    all() {
      try {
        const storage = resolve();
        if (storage) {
          const snapshot = new Map<string, string>();
          const length = storage.length;
          for (let i = 0; i < length; i++) {
            const key = storage.key(i);
            if (key === null) continue;
            const value = storage.getItem(key);
            if (value !== null) snapshot.set(key, value);
          }
          for (const [key, value] of pending) {
            if (value === null) snapshot.delete(key);
            else snapshot.set(key, value);
          }
          // An incomplete enumeration must not discard the existing fallback.
          memory = snapshot;
        }
      } catch { /* Return the last complete snapshot and local changes. */ }
      return Object.fromEntries(memory);
    },
  };
}

// The storage getter is evaluated lazily, inside the guarded operations above.
export const safeStorage: SafeStorage = createSafeStorage();
