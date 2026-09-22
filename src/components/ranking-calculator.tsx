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
import { ResultTile } from "./result-tile";
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

function targetLabel(
  band: RankingBand,
  entries: RankingLadder,
  t: Translator,
  game: Translator,
  locale: string,
) {
  const target = band.target
    ? findRankingEntry(entries, band.target)
    : undefined;
  // Resolved against the ACTIVE ladder only (Codex review, PR #135): a band
  // may point at a rung an admin has prepared but not switched on, and naming
  // it here would put a future division on the public page — the very thing
  // the active flag exists to prevent. A target the admin has since deleted
  // is as unknown as one never set, and both read "to be defined" rather than
  // leaking a raw id.
  if (!band.movement || !target) return t("undefined");
  return t(`movements.${band.movement}`, {
    league: rankingEntryLabel(target, game, locale),
  });
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
        {/* Bloc 62/E, F: the estimated-players figure carries no "(déduit)"
            qualifier and has no block of its own — it heads the visual-scale
            zone, standing in for the removed "Échelle visuelle" title. Bloc
            110/B turned it and the League Lock into the pair of tiles below,
            in the same place. */}
        {/* Bloc 92/H1: a permanently-mounted live region around the whole
            result area — the figures and the interval tiles — so the
            recomputed values are announced. The placeholders drop their own
            role="status" (Codex PR #116): nesting it inside this live region
            can double-announce; this wrapper already covers them. */}
        <div aria-live="polite">
          {/* Bloc 110/B: the two figures that head this zone are tiles now,
              side by side — including on a phone, the one exception to the
              full-width rule the interval tiles below follow. They flex-fill
              the row, so the estimated-players tile spans it on its own while
              no entry is picked and the League Lock tile has nothing to show
              yet. */}
          <div className="ranking-info-tiles">
            <ResultTile
              className="ranking-info-tile"
              label={t("total-players")}
              value={
                result.total === null
                  ? "—"
                  : Math.ceil(result.total).toLocaleString(locale)
              }
              testId="ranking-total"
            />
            {/* Bloc 108/D: the rung the player cannot fall below this season.
                New information — the game has always had it, the tool never
                showed it. Two rungs down the active ladder, computed, never
                typed in by an admin. */}
            {entry ? (
              <ResultTile
                className="ranking-info-tile"
                label={t("league-lock")}
                value={
                  lock
                    ? rankingEntryLabel(lock, game, locale)
                    : t("league-lock-none")
                }
                testId="ranking-league-lock"
              />
            ) : null}
          </div>
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
            <>
              <RankingScale
                bands={bands}
                entries={entries}
                percentage={percentage}
                narrow={narrow}
                shades={shades}
              />
              <h2 className="calculator-heading">{t("ranking-ranges")}</h2>
              {/* Bloc 110/C: one tile per interval, in place of the summary
                  table's rows — each painted the color of its own segment on
                  the scale above, so the eye can go from a slice of the bar
                  straight to the tile that describes it. */}
              <ul className="ranking-band-tiles">
                {result.ranges.map((range) => (
                  // Keyed on bandIndex, not on the threshold: two bands can
                  // share a threshold (Codex review, PR #137), and a
                  // duplicate React key would let one tile reuse the other's
                  // DOM node.
                  <RankingBandTile
                    key={range.bandIndex}
                    range={range}
                    color={bandShade(shades, range.bandIndex)}
                    entries={entries}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Bloc 110/C: one interval of the ladder, as a tile.
 *
 * It replaces a row of the summary table and carries everything that row did:
 * the threshold range as its headline, the movement and target league beside
 * it, then the rank range and the three reward types.
 *
 * The rewards keep Bloc 108/H's rule exactly — all three types are always
 * named, and a type this interval does not grant shows no value at all. That
 * pairing is the whole point: a list that simply left out an absent reward
 * read as though the tool did not track it, and a dash at 0 is noise the
 * owner asked not to draw.
 */
function RankingBandTile({
  range,
  color,
  entries,
}: {
  range: RankingRange;
  color: string;
  entries: RankingLadder;
}) {
  const t = useTranslations("ranking");
  const game = useTranslations("game");
  const locale = useLocale();
  const unknownTarget = !range.movement || !range.target;
  return (
    <li className="ranking-band-tile total-box" style={bandColorStyle(color)}>
      <div className="ranking-band-tile-head">
        <span className="ranking-band-range">
          {range.threshold}–{range.rangeStart}%
        </span>
        <span
          className={
            unknownTarget
              ? "ranking-band-target ranking-unknown"
              : "ranking-band-target"
          }
        >
          {targetLabel(range, entries, t, game, locale)}
        </span>
      </div>
      <dl className="ranking-band-facts">
        <div className="ranking-band-fact">
          <dt>{t("columns.rank")}</dt>
          <dd className="value">
            {range.rankEnd.toLocaleString(locale)} –{" "}
            {range.rankStart.toLocaleString(locale)}
          </dd>
        </div>
        {rankRewardTypes.map((type) => {
          const quantity = rewardQuantity(range, type);
          return (
            <div className="ranking-band-fact" key={type}>
              <dt>{t(`columns.${type}`)}</dt>
              <dd className="value">
                {quantity ? quantity.toLocaleString(locale) : ""}
              </dd>
            </div>
          );
        })}
      </dl>
    </li>
  );
}

function RankingScale({
  bands,
  entries,
  percentage,
  narrow,
  shades,
}: {
  bands: RankingBand[];
  entries: RankingLadder;
  percentage: number;
  narrow: boolean;
  shades: string[];
}) {
  const t = useTranslations("ranking");
  const game = useTranslations("game");
  const locale = useLocale();
  const sorted = [...bands].sort((a, b) => a.threshold - b.threshold);
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
        const side = index % 2 === 0 ? "above" : "below";
        return (
          // Keyed on the sorted position rather than the threshold, which two
          // bands can share (Codex review, PR #137).
          <div key={index}>
            <div
              className="ranking-scale-segment"
              // Bloc 110/C: the shade travels as a custom property now, the
              // same one the interval tile below carries, and the stylesheet
              // derives the segment's own 80%-opaque fill from it.
              style={{
                left: `${left}%`,
                width: `${width}%`,
                ...bandColorStyle(bandShade(shades, index)),
              }}
              title={t("segment-tooltip", {
                threshold: band.threshold,
                start,
                target: targetLabel(band, entries, t, game, locale),
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
                {/* Bloc 110/A: the movement and its target league are gone
                    from the labels hugging the bar on a phone — too small to
                    read there, and the last interval's overlapped its
                    neighbour. Not dropped, moved: every interval tile below
                    carries the same wording, at a readable size. */}
                {narrow ? null : (
                  <div className="ranking-scale-target">
                    {targetLabel(band, entries, t, game, locale)}
                  </div>
                )}
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
