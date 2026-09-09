"use client";

import { useState } from "react";
import type { LeagueSelection } from "../lib/player-settings";
import { usePlayerSettings } from "./use-player-settings";

export function useSyncedLeague() {
  const playerLeague = usePlayerSettings().league;
  const [manualLeague, setLeague] = useState<LeagueSelection>("");
  const league = manualLeague || playerLeague;

  return [league, setLeague] as const;
}
