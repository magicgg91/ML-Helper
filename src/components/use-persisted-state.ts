"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type PersistedStateOptions<T> = {
  /** Builds the value used before storage is read, and whenever it is rejected. */
  initial: () => T;
  /**
   * Turns the raw stored string into a value, or `undefined` to fall back to
   * `initial()`. Implementations own their own validation: a stale or
   * malformed shape must be rejected here rather than trusted downstream.
   */
  parse: (raw: string) => T | undefined;
  /** Defaults to `JSON.stringify`. Override to stamp a version, etc. */
  serialize?: (value: T) => string;
  /** Runs after each write, for callers that broadcast their changes. */
  onPersist?: (value: T) => void;
};

/**
 * Bloc 93/E1+F3: the load/`loaded`/save triplet that Combat, Expédition and
 * the player settings panel each carried their own copy of.
 *
 * The read is deferred to a macrotask so the first client render matches the
 * server's (persisted values would otherwise cause a hydration mismatch), and
 * the write is gated on `loaded` so the deferred read can't be overwritten by
 * the initial value before it lands.
 *
 * `parse` returning `undefined` is the guard that Bloc 31/E.1 gave Expédition
 * and Combat lacked: a saved value of an earlier, incompatible shape falls
 * back to `initial()` instead of reaching the renderer and crashing it.
 */
export function usePersistedState<T>(
  key: string,
  {
    initial,
    parse,
    serialize = JSON.stringify,
    onPersist,
  }: PersistedStateOptions<T>,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(key);
        if (saved !== null) {
          const parsed = parse(saved);
          if (parsed !== undefined) setValue(parsed);
        }
      } catch {
        // Unreadable storage (disabled, quota, malformed) keeps the initial
        // value; the simulator stays usable either way.
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
    // Mount-only on purpose: re-reading storage after the user has started
    // editing would discard their in-progress work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, serialize(value));
    } catch {
      // A failed write (private mode, quota) must not break the UI.
    }
    onPersist?.(value);
    // `serialize`/`onPersist`/`parse` are typically inline closures; keying the
    // effect on them would re-run it on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loaded, value]);

  return [value, setValue, loaded];
}
