"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Bloc 128: rows a list holds in state, re-seeded whenever the server sends
 * a different set.
 *
 * The admin's lists keep their rows in state because they edit them in place
 * — a deletion, a status change, a visibility toggle. Seeded once, that state
 * ignores everything the server renders afterwards, and the language switch
 * is exactly that: it writes the cookie and calls `router.refresh()` rather
 * than reloading the page. The chrome around the table repainted in the new
 * language and the table did not, so Outils kept its French tool names,
 * Référentiels its French titles — both in their French sort order — until
 * somebody reloaded by hand (Bloc 126/D found the same thing on Guides).
 *
 * Re-seeding during render rather than in an effect, the way NumberField
 * does: an effect would paint the stale rows for one frame first. `rows` is a
 * new array only when the server really re-rendered, so this does not fire on
 * ordinary client re-renders.
 *
 * Every caller writes to the server before it touches this state, so a fresh
 * server list always already carries what the list did locally.
 *
 * Not for an editor's form state: there the state holds what the admin has
 * typed and not yet saved, and re-seeding it would throw that away. Those
 * screens keep `useState(initial)` on purpose (see use-editor-form.ts).
 */
export function useServerRows<T>(rows: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(rows);
  const [seed, setSeed] = useState(rows);
  if (seed !== rows) {
    setSeed(rows);
    setValue(rows);
  }
  return [value, setValue];
}
