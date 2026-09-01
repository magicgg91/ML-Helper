"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  calculateRanking,
  rankCategoryShade,
  type RankingBand,
  type RankingConfig,
  type RankingLeague,
  type RankMovement,
} from "../lib/ranking";
import { NumberStepper } from "./number-stepper";
import { LeagueButtons } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";

type Translator = ReturnType<typeof useTranslations>;

function targetLabel(band: RankingBand, t: Translator, game: Translator) {
  if (!band.movement || !band.league) return t("undefined");
  return t(`movements.${band.movement}`, {
    league: game(`leagues.${band.league}`),
  });
}

function rewardLabel(band: RankingBand, t: Translator) {
  if (!band.rewards.length) return t("undefined");
  return band.rewards
    .map((item) => t(`reward-types.${item.type}`, { count: item.quantity }))
    .join(", ");
}

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
        {/* Bloc 61/B: league buttons + both numeric fields stay on a single
            row on desktop — a dedicated flex row instead of the generic
            auto-fit .calculator-fields grid, which could otherwise wrap the
            wider button group onto its own line. */}
        <div className="ranking-fields">
          {/* Bloc 62/D: a visible label above the button group, matching
              the 2 numeric fields beside it — LeagueButtons only ever
              carried its label as an aria-label (every other caller relies
              on that alone), but here it sits next to 2 fields that do
              show theirs, so the missing one reads as an omission. */}
          <div className="calculator-field ranking-league-field">
            {t("fields.league")}
            <LeagueButtons
              label={t("fields.league")}
              value={league}
              onChange={setLeague}
            />
          </div>
          <label className="calculator-field ranking-number-field">
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
          <label className="calculator-field ranking-number-field">
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
        {/* Bloc 62/E, F: renamed (no more "(déduit)" qualifier) and moved
            off its own dedicated block — this line now sits directly atop
            the visual-scale zone, standing in for the removed "Échelle
            visuelle" title, instead of occupying separate space of its
            own. */}
        <div className="ranking-scale-total">
          <span className="label">{t("total-players")}</span>
          <strong className="value" data-testid="ranking-total">
            {result.total === null
              ? "—"
              : Math.ceil(result.total).toLocaleString(locale)}
          </strong>
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
                          !range.movement || !range.league
                            ? "ranking-unknown"
                            : ""
                        }
                      >
                        {targetLabel(range, t, game)}
                      </td>
                      <td
                        className={
                          !range.rewards.length ? "ranking-unknown" : ""
                        }
                      >
                        {rewardLabel(range, t)}
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
  const game = useTranslations("game");
  const locale = useLocale();
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
  const categoryCounters: Record<RankMovement, number> = {
    promotion: 0,
    stay: 0,
    relegation: 0,
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
        const category = band.movement ?? "stay";
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
                target: targetLabel(band, t, game),
                reward: rewardLabel(band, t),
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
                <div className="ranking-scale-target">
                  {targetLabel(band, t, game)}
                </div>
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
