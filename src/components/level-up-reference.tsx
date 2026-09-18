"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { formatGameNumber } from "../lib/format";
import {
  availableLevelUpLeagues,
  hasLevelUpTroopsFormula,
  levelUpChestAt,
  levelUpTroopsAt,
  levelUpXpToReach,
  type LevelUpParameters,
} from "../lib/level-up";
import type { League } from "../lib/player-settings";
import { LeagueButtons } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog, toolHref } from "../lib/reference-catalog";

function LevelTable({
  levels,
  league,
  parameters,
}: {
  levels: number[];
  league: League;
  parameters: LevelUpParameters;
}) {
  const t = useTranslations("level-up");
  return (
    // Bloc 38/M: same calculator-card/ranking-table-wrap treatment as the
    // Templiers and Gemmes reference tables — border and background around
    // each of the 2 side-by-side tables, instead of a bare .table-scroll.
    <section className="calculator-card ranking-table-wrap">
      <table className="ranking-table reference-simple-table">
        <thead>
          <tr>
            <th>{t("columns.level")}</th>
            <th>{t("columns.xp")}</th>
            <th>{t("columns.troops")}</th>
            <th>{t("columns.reward")}</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => {
            const chest = levelUpChestAt(level, parameters);
            // Bloc 107/B: the XP to REACH this level, not to leave it — see
            // levelUpXpToReach. Level 1 has no such cost and shows the same
            // em dash the reward column uses for a level with no chest.
            const xp = levelUpXpToReach(level, parameters);
            return (
              <tr key={level}>
                <td>{level}</td>
                <td className="value">
                  {xp === null ? "—" : formatGameNumber(xp)}
                </td>
                <td className="value">
                  {formatGameNumber(
                    levelUpTroopsAt(level, league, parameters) ?? 0,
                  )}
                </td>
                <td
                  className={
                    chest === null ? "level-up-chest-empty" : "level-up-chest"
                  }
                >
                  {chest === null ? "—" : t(`chests.${chest}`)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function LevelUpReference({
  parameters,
}: {
  parameters: LevelUpParameters;
}) {
  const t = useTranslations("level-up");
  const game = useTranslations("game");
  const xpGainRate = useTranslations("xp-gain-rate");
  const crossReference = useTranslations("crossReference");
  const levelUpReference = referenceCatalog.find(
    (item) => item.slug === "level-up",
  )!;
  const [league, setLeague] = useSyncedLeague();
  const available = availableLevelUpLeagues(parameters);
  // Intl handles the "A, B et C" joining per language, so the sentence below
  // needs no hand-written separator in any of the 5 locales.
  const listFormatter = new Intl.ListFormat(useLocale(), {
    type: "conjunction",
  });
  const [page, setPage] = useState(0);
  const start = page * parameters.pageSize + 1;
  const levels = Array.from(
    { length: Math.min(parameters.pageSize, parameters.maxLevel - start + 1) },
    (_, index) => start + index,
  );
  const columns = [
    levels.slice(0, parameters.columnSize),
    levels.slice(parameters.columnSize),
  ];
  const pages = Math.ceil(parameters.maxLevel / parameters.pageSize);
  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <LeagueButtons
          label={t("league")}
          value={league}
          onChange={(value) => {
            setLeague(value);
            setPage(0);
          }}
          className="league-buttons-grid league-buttons-half"
        />
      </section>
      {!league ? (
        <p className="empty-state" role="status">
          {t("select-league")}
        </p>
      ) : !hasLevelUpTroopsFormula(league, parameters) ? (
        // Bloc 98/A: a league is unavailable because its formula is missing
        // from the parameters, not because of its name — and the leagues it
        // names are the ones that really do have one, so this sentence can no
        // longer contradict what an admin has just saved.
        <p className="empty-state" role="status">
          {t("unconfirmed", {
            count: available.length,
            leagues: listFormatter.format(
              available.map((item) => game(`leagues.${item}`)),
            ),
          })}
        </p>
      ) : (
        <>
          <section className="level-up-tables">
            {columns
              .filter((column) => column.length)
              .map((column) => (
                <LevelTable
                  key={column[0]}
                  levels={column}
                  league={league}
                  parameters={parameters}
                />
              ))}
          </section>
          <nav className="pagination" aria-label={t("pagination-label")}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              {t("previous")}
            </button>
            <span>{t("page", { current: page + 1, total: pages })}</span>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              {t("next")}
            </button>
          </nav>
        </>
      )}
      {/* Bloc 53/F: points at the XP Gain Rate calculator specifically — the
          closest match for this table's troop-XP data — instead of the
          generic /tools/combat category page. */}
      <CrossReferenceLink
        href={toolHref("combat", "xp")}
        title={xpGainRate("name")}
        image={levelUpReference.image}
        label={crossReference("toTool")}
      />
    </div>
  );
}
