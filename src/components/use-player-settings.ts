"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  defaultPlayerSettings,
  type PlayerSettings,
} from "../lib/player-settings";
import {
  playerSettingsChangedEvent,
  playerStorageKey,
  safePlayerSettings,
} from "./player-settings-panel";

export function usePlayerSettings(): PlayerSettings {
  const raw = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(playerSettingsChangedEvent, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(playerSettingsChangedEvent, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    () => window.localStorage.getItem(playerStorageKey) ?? "",
    () => "",
  );
  return useMemo(
    () => (raw ? safePlayerSettings(raw) : defaultPlayerSettings()),
    [raw],
  );
}
