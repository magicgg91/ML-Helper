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
import { useNarrowViewport } from "./use-narrow-viewport";
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
  // Bloc 63/A: one table per page on a narrow screen instead of two side by
  // side, so a page holds one column's worth of levels rather than two. This
  // cannot be a stylesheet rule: hiding the second table would leave its 30
  // levels on no page at all. Narrow therefore has twice as many pages, and
  // the desktop layout is untouched.
  const narrow = useNarrowViewport();
  const perPage = narrow ? parameters.columnSize : parameters.pageSize;
  const pages = Math.ceil(parameters.maxLevel / perPage);
  // Rotating a phone (or resizing) changes `pages` under a page index the
  // user already chose — index 6 is a real page on narrow and past the end on
  // wide. Clamping here keeps the render valid without an effect writing back
  // to state; the buttons below move from the clamped value, so the next
  // click is coherent with what is on screen.
  const current = Math.min(page, pages - 1);
  const start = current * perPage + 1;
  const levels = Array.from(
    { length: Math.min(perPage, parameters.maxLevel - start + 1) },
    (_, index) => start + index,
  );
  const columns = [
    levels.slice(0, parameters.columnSize),
    levels.slice(parameters.columnSize),
  ];
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
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              {t("previous")}
            </button>
            <span>{t("page", { current: current + 1, total: pages })}</span>
            <button
              type="button"
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
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
