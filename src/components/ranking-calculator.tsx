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
            wider button group onto its own line.
            Bloc 64/G: each label now sits inline immediately before its own
            control (option (b) of Bloc 62/D, settled here) — same rule for
            all 3, so none of them carries a label above it any more.
            Bloc 71/B: reversed for the league field only — desktop now
            joins the Villes/Demo Attack pattern (Blocs 69/70): a title
            above the buttons, fixed at 50% of the row, instead of the
            inline label. The 2 numeric fields keep Bloc 64/G's inline
            style; mobile is unaffected (it already stacks title-above via
            .ranking-fields' own mobile rule, independent of this class). */}
        <div className="ranking-fields">
          <div className="calculator-field ranking-league-field">
            <span className="ranking-field-label">{t("fields.league")}</span>
            <LeagueButtons
              label={t("fields.league")}
              value={league}
              onChange={setLeague}
              className="league-buttons-grid"
            />
          </div>
          <label className="calculator-field ranking-inline-field ranking-number-field">
            <span className="ranking-field-label">{t("fields.percentage")}</span>
            <NumberStepper
              label={t("fields.percentage")}
              value={percentage}
              min={0}
              max={100}
              step={0.01}
              onChange={setPercentage}
            />
          </label>
          <label className="calculator-field ranking-inline-field ranking-number-field">
            <span className="ranking-field-label">{t("fields.rank")}</span>
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
            <h2 className="calculator-heading">{t("ranking-ranges")}</h2>
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
