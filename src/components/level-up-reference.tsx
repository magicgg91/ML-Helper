"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatGameNumber } from "../lib/city-calculators";
import {
  levelUpChestAt,
  levelUpTroopsAt,
  xpAt,
  type LevelUpParameters,
} from "../lib/level-up";
import type { League } from "../lib/player-settings";
import { LeagueSelect } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";

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
    <div className="table-scroll">
      <table className="ranking-table">
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
            return (
              <tr key={level}>
                <td>{level}</td>
                <td className="value">
                  {formatGameNumber(xpAt(level, parameters))}
                </td>
                <td className="value">
                  {formatGameNumber(
                    levelUpTroopsAt(level, league, parameters) ?? 0,
                  )}
                </td>
                <td>{chest === null ? "—" : t(`chests.${chest}`)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LevelUpReference({
  parameters,
}: {
  parameters: LevelUpParameters;
}) {
  const t = useTranslations("level-up");
  const [league, setLeague] = useSyncedLeague();
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
        <LeagueSelect
          label={t("league")}
          value={league}
          onChange={(value) => {
            setLeague(value);
            setPage(0);
          }}
        />
      </section>
      {!league ? (
        <p className="empty-state" role="status">
          {t("select-league")}
        </p>
      ) : league === "silver" ? (
        <p className="empty-state" role="status">
          {t("unconfirmed")}
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
      <Link className="reference-link" href="/tools/combat">
        {t("combat-link")}
      </Link>
    </div>
  );
}
