"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import {
  activeLadder,
  calculateRanking,
  findRankingEntry,
  leagueLockFor,
  rankBandShades,
  rankCategoryShade,
  rankRewardTypes,
  type RankingBand,
  type RankingEntry,
  type RankingLadder,
  type RankingRange,
  type RankRewardType,
} from "../lib/ranking";
import { leagueButtonRows, sliceIntoRows } from "../lib/league-button-rows";
import { pickFrEn } from "../lib/translations";
import { NumberStepper } from "./number-stepper";
import {
  LeagueLockIcon,
  RankMovementIcon,
  RankRewardIcon,
} from "./ranking-icons";
import { useNarrowViewport } from "./use-narrow-viewport";
import { usePlayerSettings } from "./use-player-settings";

type Translator = ReturnType<typeof useTranslations>;

/**
 * Bloc 108/A: an entry's name in the reader's own language.
 *
 * A free name wins when an admin typed one — the rename escape hatch — and it
 * is stored per locale, read through pickFrEn so a missing translation falls
 * back to English like everything else on this site (Codex review, PR #135:
 * a single-language name would have reached every reader unchanged).
 * Otherwise the name is built from the base league, which IS translated
 * (game.leagues.*), plus the division label: "Or" + "1" reads "Or 1" in
 * French and "Gold 1" in English, with nothing to translate by hand.
 */
export function rankingEntryLabel(
  entry: RankingEntry,
  game: Translator,
  locale: string,
) {
  const free = pickFrEn(entry.nameFr, entry.nameEn, locale);
  if (free) return free;
  const base = entry.league ? game(`leagues.${entry.league}`) : "";
  return entry.division ? `${base} ${entry.division}`.trim() : base;
}

/**
 * Bloc 112: what a range leads to, as two separate pieces — the movement verb
 * and the league it points at. The tile styles and sizes them differently, so
 * they can no longer be one sentence as they were up to Bloc 110.
 *
 * Resolved against the ACTIVE ladder only (Codex review, PR #135): a band may
 * point at a rung an admin has prepared but not switched on, and naming it
 * here would put a future division on the public page — the very thing the
 * active flag exists to prevent. A target the admin has since deleted is as
 * unknown as one never set, and both read "to be defined" rather than leaking
 * a raw id, with no verb in front of it.
 */
function rangeTarget(
  band: RankingBand,
  entries: RankingLadder,
  t: Translator,
  game: Translator,
  locale: string,
): { verb: string | null; league: string } {
  const target = band.target
    ? findRankingEntry(entries, band.target)
    : undefined;
  if (!band.movement || !target) return { verb: null, league: t("undefined") };
  return {
    verb: t(`movements.${band.movement}`),
    league: rankingEntryLabel(target, game, locale),
  };
}

function rewardQuantity(band: RankingBand, type: RankRewardType) {
  return band.rewards.find((item) => item.type === type)?.quantity ?? 0;
}

/**
 * Bloc 110/C: the color both the scale segment and the interval tile use.
 *
 * Both sides read the same list at the same index, so they cannot drift.
 * An index past its end cannot happen — the list is built from these very
 * bands — and the fallback keeps a color rather than an unset custom property
 * if that ever stopped being true.
 */
function bandShade(shades: string[], index: number) {
  return shades[index] ?? rankCategoryShade("stay", 0);
}

/** The color a segment and its tile share, as a CSS custom property. */
function bandColorStyle(color: string) {
  // React's CSSProperties has no room for custom properties, hence the cast —
  // it is the standard way to set one inline and stays fully typed otherwise.
  return { "--band-color": color } as CSSProperties;
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
  // answer.
  const ofLeague = settings.league
    ? entries.filter((entry) => entry.league === settings.league)
    : [];
  const fromSettings =
    // The stored division must still belong to the league the player is in
    // (Codex review, PR #135): an admin can move an entry to another base
    // league while its id — which is what was persisted — stays the same, and
    // the calculator would then quietly show another league's bands.
    ofLeague.find((entry) => entry.id === settings.division)?.id ??
    // Without one, a league that still has a single rung resolves on its own;
    // a league already split into divisions does not, and the player picks —
    // guessing which half of their league they are in would invent data.
    (ofLeague.length === 1 ? ofLeague[0].id : undefined);
  const entryId = manualEntry || fromSettings || "";
  const entry = entries.find((item) => item.id === entryId);
  const bands = entry?.bands ?? [];
  const lock = entry ? leagueLockFor(ladder, entry.id) : null;
  const [percentage, setPercentage] = useState(1);
  const [rank, setRank] = useState(10);
  const result = calculateRanking(bands, percentage, rank);
  // Bloc 110/C: computed once, from the bands, and handed to both the scale
  // and the tiles — see rankBandShades.
  const shades = rankBandShades(bands);
  // Bloc 109: how many buttons each row carries. The split depends on a width
  // only the browser knows — the same server-renders-wide, client-corrects
  // trade-off useNarrowViewport carries for the reference tables.
  const narrow = useNarrowViewport();
  const buttonRows = leagueButtonRows(entries.length, narrow);
  // Bloc 110/1: a phone always gets the two fixed columns, at any count, so
  // it always uses the row markup; desktop only splits once the single row
  // it has always had stops fitting, above six.
  const splitRows = narrow || buttonRows.length > 1;
  const entryButton = (item: RankingEntry) => (
    <button
      key={item.id}
      type="button"
      aria-pressed={item.id === entryId}
      onClick={() => setManualEntry(item.id)}
    >
      {rankingEntryLabel(item, game, locale)}
    </button>
  );

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
            with no code change.
            Bloc 109: and since that count is now whatever an admin switched
            on, the picker lays them over as many rows as it takes — see
            leagueButtonRows. On desktop at six or fewer the markup below is
            byte for byte what it was, so the layout it has always had is
            untouched.
            Bloc 110/1: mobile is now always two fixed columns instead — three
            to a row broke the page width once real division names were in
            play. */}
        <div className="ranking-fields">
          <div className="calculator-field ranking-league-field">
            <span className="ranking-field-label">{t("fields.entry")}</span>
            <div
              className={
                splitRows
                  ? "family-buttons league-buttons-grid league-buttons-rows"
                  : "family-buttons league-buttons-grid"
              }
              role="group"
              aria-label={t("fields.entry")}
            >
              {splitRows
                ? sliceIntoRows(entries, buttonRows).map((row) => (
                    <div className="league-button-row" key={row[0].id}>
                      {row.map(entryButton)}
                    </div>
                  ))
                : entries.map(entryButton)}
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
        {/* Bloc 92/H1: a permanently-mounted live region around the whole
            result area — the header and the range tiles — so the recomputed
            values are announced. The placeholders drop their own
            role="status" (Codex PR #116): nesting it inside this live region
            can double-announce; this wrapper already covers them. */}
        <div aria-live="polite">
          {/* Bloc 112: the section's own header. The heading used to sit
              inside the ranges branch; it is above the branch now so that the
              League Lock beside it survives the states where there are no
              ranges to show — an entry whose thresholds are not filled in yet
              still has a lock, and Bloc 108/D has shown it there since.
              Bloc 112 also removed what used to head this zone: the estimated
              player count (the last range's upper bound already says it) and
              the single 100%->0% scale (every tile carries its own bar now). */}
          {entry ? (
            <div className="ranking-ranges-header">
              <h2 className="calculator-heading">{t("ranking-ranges")}</h2>
              {/* Bloc 108/D: the rung the player cannot fall below this
                  season. Computed, never typed in by an admin. Bloc 112
                  shrank it from a tile to this chip. */}
              <p className="ranking-lock-chip">
                <LeagueLockIcon />
                <span className="ranking-lock-chip-label">
                  {t("league-lock")}
                </span>
                <strong
                  className="ranking-lock-chip-value"
                  data-testid="ranking-league-lock"
                >
                  {lock
                    ? rankingEntryLabel(lock, game, locale)
                    : t("league-lock-none")}
                </strong>
              </p>
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
                entry: rankingEntryLabel(entry, game, locale),
              })}
            </p>
          ) : (
            <ul className="ranking-range-tiles">
              {result.ranges.map((range) => (
                // Keyed on bandIndex, not on the threshold: two bands can
                // share a threshold (Codex review, PR #137), and a duplicate
                // React key would let one tile reuse the other's DOM node.
                <RankingRangeTile
                  key={range.bandIndex}
                  range={range}
                  color={bandShade(shades, range.bandIndex)}
                  entries={entries}
                  percentage={percentage}
                  narrow={narrow}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Bloc 112: one range of the ladder, as a tile.
 *
 * Everything it shows is already computed — the range, its ranks, its
 * rewards, the player's own percentage — so this only lays them out. Three
 * groups, side by side on a desktop row and stacked on a phone: what the
 * range leads to, where it sits (ranks, percentile, and its slice of the
 * ladder as a bar), and what it pays.
 *
 * Only the rewards this range actually grants are drawn, which reverses Bloc
 * 108/H's rule on purpose: that rule existed because a SENTENCE that silently
 * dropped an absent reward read as though the tool did not track it. A named
 * mini-tile cannot read that way — what is absent is absent, and the leagues
 * that grant a single reward no longer carry two empty slots.
 */
function RankingRangeTile({
  range,
  color,
  entries,
  percentage,
  narrow,
}: {
  range: RankingRange;
  color: string;
  entries: RankingLadder;
  percentage: number;
  narrow: boolean;
}) {
  const t = useTranslations("ranking");
  const game = useTranslations("game");
  const locale = useLocale();
  const { verb, league } = rangeTarget(range, entries, t, game, locale);
  // The movement decides the strong color of this tile's badge, league name
  // and bar segment — fixed per movement, unlike the band shade, which also
  // varies with the range's position inside its movement group.
  const movement = range.movement ?? "stay";
  // Bloc 112: the percentile the range covers. The first one has no lower
  // bound to name, so it reads as a "top N%" instead of a span.
  const percentile =
    range.rangeStart === 0
      ? t("percentile-top", { value: range.threshold })
      : t("percentile-range", { from: range.rangeStart, to: range.threshold });
  // The player sits in exactly one range: the bounds are half-open at the
  // bottom, so a percentage landing exactly on a threshold belongs to the
  // better of the two ranges that share it, never to both.
  const playerHere =
    percentage > range.rangeStart && percentage <= range.threshold;
  const playerLabel = t("player-position", {
    percentage: percentage.toLocaleString(locale, { maximumFractionDigits: 2 }),
  });
  const playerBubble = (
    <span className="ranking-player-bubble">{playerLabel}</span>
  );
  const rewards = rankRewardTypes
    .map((type) => ({ type, quantity: rewardQuantity(range, type) }))
    .filter((reward) => reward.quantity > 0);
  return (
    <li
      className={`ranking-range-tile ranking-range-${movement}`}
      style={bandColorStyle(color)}
    >
      <span className="ranking-range-accent" aria-hidden="true" />
      <div className="ranking-range-result">
        <span className="ranking-range-badge" aria-hidden="true">
          <RankMovementIcon movement={range.movement} />
        </span>
        <span className="ranking-range-result-text">
          {verb ? <span className="ranking-range-verb">{verb}</span> : null}
          <span
            className={
              verb
                ? "ranking-range-league"
                : "ranking-range-league ranking-unknown"
            }
          >
            {league}
          </span>
        </span>
      </div>
      <div className="ranking-range-position">
        <div className="ranking-range-position-top">
          <span className="ranking-range-ranks">
            <span className="ranking-range-ranks-label">{t("tile.ranks")}</span>
            <span className="ranking-range-ranks-value">
              {range.rankStart.toLocaleString(locale)} –{" "}
              {range.rankEnd.toLocaleString(locale)}
            </span>
            {/* One bubble, not two hidden by CSS: it is the player's position
                written out, and a screen reader must not read it twice. */}
            {playerHere && !narrow ? playerBubble : null}
          </span>
          <span className="ranking-range-percentile">{percentile}</span>
        </div>
        {/* The bar restates the percentile and the player's position, both of
            which are already on the tile as text, so it is decorative. */}
        <div className="ranking-range-bar" aria-hidden="true">
          <span
            className="ranking-range-bar-segment"
            style={{
              left: `${range.rangeStart}%`,
              width: `${range.threshold - range.rangeStart}%`,
            }}
          />
          {playerHere ? (
            <span
              className="ranking-range-bar-player"
              data-testid="ranking-player-marker"
              style={{ left: `${percentage}%` }}
            />
          ) : null}
        </div>
        {playerHere && narrow ? playerBubble : null}
      </div>
      <div className="ranking-range-rewards">
        {rewards.map((reward) => (
          <span className="ranking-reward-tile" key={reward.type}>
            <span className="ranking-reward-label">
              <RankRewardIcon type={reward.type} />
              {t(`tile.${reward.type}`)}
            </span>
            <span className="ranking-reward-value">
              {reward.quantity.toLocaleString(locale)}
            </span>
          </span>
        ))}
      </div>
    </li>
  );
}
