"use client";

import { useTranslations } from "next-intl";
import { leagues, type LeagueSelection } from "../lib/player-settings";

export function LeagueSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LeagueSelection;
  onChange: (league: LeagueSelection) => void;
}) {
  const common = useTranslations("common");
  const game = useTranslations("game");
  return (
    <label className="calculator-field">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as LeagueSelection)}
      >
        <option value="">{common("choose")}</option>
        {leagues.map((league) => (
          <option key={league} value={league}>
            {game(`leagues.${league}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

// Bloc 61: single-select league picker using the same visual/interaction
// pattern as the equipment family filter buttons (.family-buttons,
// role="group", aria-pressed) instead of a <select> — the synced-league
// logic (useSyncedLeague) is untouched, only the picker UI changes.
export function LeagueButtons({
  label,
  value,
  onChange,
  // Bloc 68/N: an opt-in extra class (e.g. "league-buttons-grid") for
  // callers that want a specific mobile layout instead of the default
  // wrap — every other caller is unaffected by omitting it.
  className,
}: {
  label: string;
  value: LeagueSelection;
  onChange: (league: LeagueSelection) => void;
  className?: string;
}) {
  const game = useTranslations("game");
  return (
    <div
      className={className ? `family-buttons ${className}` : "family-buttons"}
      role="group"
      aria-label={label}
    >
      {leagues.map((league) => (
        <button
          key={league}
          type="button"
          aria-pressed={value === league}
          onClick={() => onChange(league)}
        >
          {game(`leagues.${league}`)}
        </button>
      ))}
    </div>
  );
}
