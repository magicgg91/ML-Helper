"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  activeLadder,
  calculateRanking,
  findRankingEntry,
  leagueLockFor,
  rankCategoryShade,
  rankRewardTypes,
  type RankingBand,
  type RankingEntry,
  type RankingLadder,
  type RankMovement,
  type RankRewardType,
} from "../lib/ranking";
import { NumberStepper } from "./number-stepper";
import { usePlayerSettings } from "./use-player-settings";

type Translator = ReturnType<typeof useTranslations>;

/**
 * Bloc 108/A: an entry's name in the reader's own language.
 *
 * A free-text `name` wins when an admin typed one — it is the rename escape
 * hatch, and it can only ever exist in one language. Otherwise the name is
 * built from the base league, which IS translated (game.leagues.*), plus the
 * division label: "Or" + "1" reads "Or 1" in French and "Gold 1" in English,
 * with nothing to translate by hand.
 */
export function rankingEntryLabel(entry: RankingEntry, game: Translator) {
  if (entry.name) return entry.name;
  const base = entry.league ? game(`leagues.${entry.league}`) : "";
  return entry.division ? `${base} ${entry.division}`.trim() : base;
}

function targetLabel(
  band: RankingBand,
  ladder: RankingLadder,
  t: Translator,
  game: Translator,
) {
  const target = band.target
    ? findRankingEntry(ladder, band.target)
    : undefined;
  // A target the admin has since deleted is as unknown as one never set —
  // better an explicit "to be defined" than a raw id leaking onto the page.
  if (!band.movement || !target) return t("undefined");
  return t(`movements.${band.movement}`, {
    league: rankingEntryLabel(target, game),
  });
}

function rewardQuantity(band: RankingBand, type: RankRewardType) {
  return band.rewards.find((item) => item.type === type)?.quantity ?? 0;
}

function rewardSentence(band: RankingBand, t: Translator) {
  if (!band.rewards.length) return t("undefined");
  return band.rewards
    .map((item) => t(`reward-types.${item.type}`, { count: item.quantity }))
    .join(", ");
}

export function RankingCalculator({ ladder }: { ladder: RankingLadder }) {
  const locale = useLocale();
  const t = useTranslations("ranking");
  const game = useTranslations("game");
  // Bloc 108/C+G: only active entries reach the public page, in the order an
  // admin gave them — however many there are. Nothing here counts on six.
  const entries = activeLadder(ladder);
  const settings = usePlayerSettings();
  const [manualEntry, setManualEntry] = useState("");
  // Bloc 108/E: the player's own division wins, because it is the precise
  // answer. Without one, a league that still has a single rung resolves on its
  // own; a league already split into divisions does not, and the player picks
  // — guessing which half of their league they are in would be inventing data.
  const fromSettings =
    entries.find((entry) => entry.id === settings.division)?.id ??
    (settings.league
      ? (() => {
          const ofLeague = entries.filter(
            (entry) => entry.league === settings.league,
          );
          return ofLeague.length === 1 ? ofLeague[0].id : undefined;
        })()
      : undefined);
  const entryId = manualEntry || fromSettings || "";
  const entry = entries.find((item) => item.id === entryId);
  const bands = entry?.bands ?? [];
  const lock = entry ? leagueLockFor(ladder, entry.id) : null;
  const [percentage, setPercentage] = useState(1);
  const [rank, setRank] = useState(10);
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
            .ranking-fields' own mobile rule, independent of this class).
            Bloc 108/A: the buttons are built from the ladder rather than the
            fixed league enum, so a division added in the admin appears here
            with no code change. */}
        <div className="ranking-fields">
          <div className="calculator-field ranking-league-field">
            <span className="ranking-field-label">{t("fields.entry")}</span>
            <div
              className="family-buttons league-buttons-grid"
              role="group"
              aria-label={t("fields.entry")}
            >
              {entries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === entryId}
                  onClick={() => setManualEntry(item.id)}
                >
                  {rankingEntryLabel(item, game)}
                </button>
              ))}
            </div>
          </div>
          <label className="calculator-field ranking-inline-field ranking-number-field">
            <span className="ranking-field-label">
              {t("fields.percentage")}
            </span>
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
        {/* Bloc 92/H1: a permanently-mounted live region around the whole
            result area — the total and the ranges table — so the recomputed
            values are announced. The placeholders drop their own role="status"
            (Codex PR #116): nesting it inside this live region can
            double-announce; this wrapper already covers them. */}
        <div aria-live="polite">
          <div className="ranking-scale-total">
            <span className="label">{t("total-players")}</span>
            <strong className="value" data-testid="ranking-total">
              {result.total === null
                ? "—"
                : Math.ceil(result.total).toLocaleString(locale)}
            </strong>
          </div>
          {/* Bloc 108/D: the rung the player cannot fall below this season.
              New information — the game has always had it, the tool never
              showed it. Two rungs down the active ladder, computed, never
              typed in by an admin. */}
          {entry ? (
            <div className="ranking-scale-total ranking-league-lock">
              <span className="label">{t("league-lock")}</span>
              <strong className="value" data-testid="ranking-league-lock">
                {lock ? rankingEntryLabel(lock, game) : t("league-lock-none")}
              </strong>
            </div>
          ) : null}
          {!entry ? (
            <p className="ranking-placeholder">{t("errors.select-league")}</p>
          ) : percentage <= 0 ? (
            <p className="ranking-placeholder">
              {t("errors.positive-percentage")}
            </p>
          ) : bands.length === 0 ? (
            // Bloc 108/C: an active entry whose thresholds aren't filled in
            // yet says so, exactly as the Progression reference does for a
            // league whose formula isn't confirmed. It is NOT hidden —
            // active/inactive is the only thing that decides visibility.
            <p className="ranking-placeholder">
              {t("errors.missing-bands", {
                entry: rankingEntryLabel(entry, game),
              })}
            </p>
          ) : (
            <>
              <RankingScale
                bands={bands}
                ladder={ladder}
                percentage={percentage}
              />
              <h2 className="calculator-heading">{t("ranking-ranges")}</h2>
              <div className="ranking-table-wrap">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>{t("columns.range")}</th>
                      <th>{t("columns.rank")}</th>
                      <th>{t("columns.target-league")}</th>
                      {/* Bloc 108/H: one column per reward type, named, the
                          way the admin has always shown them. They used to be
                          folded into a single sentence that simply left out
                          whichever reward was absent — so a row with sapphires
                          and gems but no speedups read as though the tool did
                          not track speedups at all. */}
                      {rankRewardTypes.map((type) => (
                        <th key={type}>{t(`columns.${type}`)}</th>
                      ))}
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
                            !range.movement || !range.target
                              ? "ranking-unknown"
                              : ""
                          }
                        >
                          {targetLabel(range, ladder, t, game)}
                        </td>
                        {rankRewardTypes.map((type) => {
                          const quantity = rewardQuantity(range, type);
                          return (
                            <td
                              key={type}
                              className={
                                quantity ? "value" : "value ranking-unknown"
                              }
                            >
                              {quantity ? quantity.toLocaleString(locale) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function RankingScale({
  bands,
  ladder,
  percentage,
}: {
  bands: RankingBand[];
  ladder: RankingLadder;
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
            <span className="ranking-scale-tick" style={{ left: `${left}%` }} />
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
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: `${color}CC`,
              }}
              title={t("segment-tooltip", {
                threshold: band.threshold,
                start,
                target: targetLabel(band, ladder, t, game),
                reward: rewardSentence(band, t),
              })}
            />
            <div
              className="ranking-scale-marker"
              style={{ left: `${left + width / 2}%` }}
            >
              <div
                className={`ranking-scale-label ranking-scale-label-${side}`}
              >
                <div className="ranking-scale-range">
                  {band.threshold}–{start}%
                </div>
                <div className="ranking-scale-target">
                  {targetLabel(band, ladder, t, game)}
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
