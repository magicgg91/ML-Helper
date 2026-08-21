"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  calculateRanking,
  rankingLeagues,
  type RankingConfig,
  type RankingLeague,
} from "../lib/ranking";
import { NumberStepper } from "./number-stepper";

export function RankingCalculator({ config }: { config: RankingConfig }) {
  const locale = useLocale();
  const t = useTranslations("ranking");
  const game = useTranslations("game");
  const [league, setLeague] = useState<RankingLeague>("diamond");
  const [percentage, setPercentage] = useState(1);
  const [rank, setRank] = useState(10);
  const bands = config[league];
  const result = calculateRanking(bands, percentage, rank);

  return (
    <div className="calculator-stack ranking-calculator">
      <section className="calculator-card">
        <div className="calculator-fields">
          <label className="calculator-field">
            {t("fields.league")}
            <select
              value={league}
              onChange={(event) =>
                setLeague(event.target.value as RankingLeague)
              }
            >
              {rankingLeagues.map((item) => (
                <option key={item} value={item}>
                  {game(`leagues.${item}`)}
                  {config[item].length === 0 ? t("undefined-suffix") : ""}
                </option>
              ))}
            </select>
          </label>
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
        {percentage <= 0 ? (
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
            <RankingScale bands={bands} />
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

function RankingScale({ bands }: { bands: RankingConfig[RankingLeague] }) {
  const t = useTranslations("ranking");
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  return (
    <div className="ranking-scale" aria-label={t("scale-label")}>
      <div className="ranking-axis-labels">
        <span>100%</span>
        <span>0%</span>
      </div>
      <div className="ranking-segments">
        {sorted
          .map((band, index) => {
            const start = index === 0 ? 0 : sorted[index - 1].threshold;
            return (
              <div
                key={band.threshold}
                className={`ranking-segment ranking-segment-${index % 2}`}
                style={{ width: `${band.threshold - start}%` }}
                title={t("segment-tooltip", {
                  threshold: band.threshold,
                  start,
                  target: band.target,
                  reward: band.reward,
                })}
              >
                <span>
                  {band.threshold}–{start}%
                </span>
              </div>
            );
          })
          .reverse()}
      </div>
      <div className="ranking-ticks">
        {Array.from({ length: 11 }, (_, index) => (
          <span key={index} style={{ left: `${index * 10}%` }}>
            {100 - index * 10}%
          </span>
        ))}
      </div>
    </div>
  );
}
