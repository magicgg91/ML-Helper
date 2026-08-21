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
