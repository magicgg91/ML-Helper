"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  calculateRanking,
  rankCategory,
  rankCategoryShade,
  type RankCategory,
  type RankingConfig,
  type RankingLeague,
} from "../lib/ranking";
import { NumberStepper } from "./number-stepper";
import { LeagueSelect } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";

export function RankingCalculator({ config }: { config: RankingConfig }) {
  const locale = useLocale();
  const t = useTranslations("ranking");
  const game = useTranslations("game");
  const [league, setLeague] = useSyncedLeague();
  const [percentage, setPercentage] = useState(1);
  const [rank, setRank] = useState(10);
  const bands = league ? config[league] : [];
  const result = calculateRanking(bands, percentage, rank);

  return (
    <div className="calculator-stack ranking-calculator">
      <section className="calculator-card">
        <div className="calculator-fields">
          <LeagueSelect
            label={t("fields.league")}
            value={league}
            onChange={setLeague}
          />
          <label className="calculator-field">
            {t("fields.percentage")}
            <NumberStepper
              label={t("fields.percentage")}
              value={percentage}
              min={0}
              max={100}
              step={0.01}
              onChange={setPercentage}
            />
          </label>
          <label className="calculator-field">
            {t("fields.rank")}
            <NumberStepper
              label={t("fields.rank")}
              value={rank}
              min={1}
              onChange={(value) => setRank(Math.floor(value))}
            />
          </label>
        </div>
      </section>
      <section className="calculator-card">
        <div className="calculator-results">
          <div className="calculator-stat total-box">
            <span className="label">{t("total-players")}</span>
            <strong className="value" data-testid="ranking-total">
              {result.total === null
                ? "—"
                : Math.round(result.total).toLocaleString(locale)}
            </strong>
          </div>
        </div>
        {!league ? (
          <p role="status" className="ranking-placeholder">
            {t("errors.select-league")}
          </p>
        ) : percentage <= 0 ? (
          <p role="status" className="ranking-placeholder">
            {t("errors.positive-percentage")}
          </p>
        ) : bands.length === 0 ? (
          <p role="status" className="ranking-placeholder">
            {t("errors.missing-bands", {
              league: game(`leagues.${league}`),
            })}
          </p>
        ) : (
          <>
            <h3>{t("visual-scale")}</h3>
            <RankingScale bands={bands} percentage={percentage} />
            <h3>{t("ranking-ranges")}</h3>
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>{t("columns.range")}</th>
                    <th>{t("columns.rank")}</th>
                    <th>{t("columns.target-league")}</th>
                    <th>{t("columns.reward")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ranges.map((range) => (
                    <tr key={range.threshold}>
                      <td>
                        {range.threshold}–{range.rangeStart}%
                      </td>
                      <td>
                        {range.rankEnd.toLocaleString(locale)} –{" "}
                        {range.rankStart.toLocaleString(locale)}
                      </td>
                      <td
                        className={
                          range.target.startsWith("À définir")
                            ? "ranking-unknown"
                            : ""
                        }
                      >
                        {range.target}
                      </td>
                      <td
                        className={
                          range.reward.startsWith("À définir")
                            ? "ranking-unknown"
                            : ""
                        }
                      >
                        {range.reward}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RankingScale({
  bands,
  percentage,
}: {
  bands: RankingConfig[RankingLeague];
  percentage: number;
}) {
  const t = useTranslations("ranking");
  const locale = useLocale();
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  const categoryCounters: Record<RankCategory, number> = {
    montee: 0,
    maintien: 0,
    descente: 0,
  };
  const playerLeft = 100 - percentage;
  return (
    <div className="ranking-scale" aria-label={t("scale-label")}>
      <div className="ranking-scale-axis" />
      {Array.from({ length: 11 }, (_, index) => {
        const value = index * 10;
        const left = 100 - value;
        return (
          <div key={value}>
            <span
              className="ranking-scale-tick"
              style={{ left: `${left}%` }}
            />
            <span
              className="ranking-scale-tick-label"
              style={{ left: `${left}%` }}
            >
              {value}%
            </span>
          </div>
        );
      })}
      {sorted.map((band, index) => {
        const start = index === 0 ? 0 : sorted[index - 1].threshold;
        const left = 100 - band.threshold;
        const width = band.threshold - start;
        const category = rankCategory(band.target);
        const color = rankCategoryShade(category, categoryCounters[category]);
        categoryCounters[category] += 1;
        const side = index % 2 === 0 ? "above" : "below";
        return (
          <div key={band.threshold}>
            <div
              className="ranking-scale-segment"
              style={{ left: `${left}%`, width: `${width}%`, background: `${color}CC` }}
              title={t("segment-tooltip", {
                threshold: band.threshold,
                start,
                target: band.target,
                reward: band.reward,
              })}
            />
            <div
              className="ranking-scale-marker"
              style={{ left: `${left + width / 2}%` }}
            >
              <div className={`ranking-scale-label ranking-scale-label-${side}`}>
                <div className="ranking-scale-range">
                  {band.threshold}–{start}%
                </div>
                <div className="ranking-scale-target">{band.target}</div>
              </div>
            </div>
          </div>
        );
      })}
      {percentage > 0 && percentage <= 100 ? (
        <div
          className="ranking-scale-player-line"
          data-testid="ranking-scale-player-line"
          style={{ left: `${playerLeft}%` }}
          data-pct={`${percentage.toLocaleString(locale, { maximumFractionDigits: 2 })}%`}
        />
      ) : null}
    </div>
  );
}
