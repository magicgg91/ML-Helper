"use client";

import { pickFrEn } from "../lib/translations";
import { useLocale, useTranslations } from "next-intl";
import { LeagueButtons } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";
import {
  eventColorVar,
  eventTextColorVar,
  timelineLabelMaxWidthRem,
  type EventRow,
  type EventsCatalog,
} from "../lib/events";

// Bloc 60 review (Codex PR #81): same fr/en fallback as Consommables'
// pickLocaleText (Bloc44-review/C) — fr visitors get the French text (or
// English if it's the only one filled in), every other locale gets English
// (or French as a last resort), never a raw missing string.
// Bloc 77/D: the season timeline — same visual principle as Classement's
// "échelle visuelle" (RankingScale, Bloc 62/F): a horizontal bar with one
// proportionally-sized, alternating-label segment per item. Segments here
// are positioned by CUMULATIVE event duration (events chain back-to-back,
// cdc) instead of a rank-percentile threshold, and there's no player-
// position line (no such concept for events) or percentile axis ticks
// (this isn't a 0–100% scale). Deliberately its own component/CSS classes
// rather than importing RankingScale — that component is ranking-specific
// (unexported, and its rank-band tooltip/marker semantics don't apply
// here) — reusing just the layout PRINCIPLE, not the literal code.
// ⚠️ Strict scope (cdc): each segment shows only the event's name and
// duration. Tiers/rewards are never rendered here — they stay in the
// collapsible card below, so the 2 zones stay complementary, not
// redundant.
function EventTimeline({
  events,
  seasonDurationDays,
  ariaLabel,
}: {
  events: readonly EventRow[];
  seasonDurationDays: number;
  ariaLabel: string;
}) {
  const common = useTranslations("common");
  const t = useTranslations("references.events");
  if (events.length === 0 || seasonDurationDays <= 0) return null;
  const totalHours = seasonDurationDays * 24;
  const segments = events.reduce<{
    cumulativeHours: number;
    items: Array<{
      event: EventRow;
      index: number;
      left: number;
      width: number;
    }>;
  }>(
    (acc, event, index) => ({
      cumulativeHours: acc.cumulativeHours + event.duration,
      items: [
        ...acc.items,
        {
          event,
          index,
          left: (acc.cumulativeHours / totalHours) * 100,
          width: (event.duration / totalHours) * 100,
        },
      ],
    }),
    { cumulativeHours: 0, items: [] },
  ).items;
  // Bloc 81/E: revises Bloc 79/D's fine 24h-tick scale (every day,
  // unconditionally, all labeled) — a LABELED tick now only marks where an
  // event actually changes (this event's own end doubling as the next
  // one's start), so the labels' count and spacing follow the league's
  // real 24h/48h/72h event durations instead of a flat interval. J0 isn't
  // a change either but is kept as the one fixed reference point for the
  // season's own start. Cumulative hours are always a whole number of
  // days (every duration is a multiple of 24h), so day = hours / 24 never
  // needs rounding.
  // Bloc 82/A review: the LAST event's own end is a transition too — it's
  // the season's own end, the exact same kind of "this event stops, the
  // next thing (nothing, here) starts" boundary as every other one — no
  // longer excluded.
  const cumulativeHoursAfterEachEvent = events.reduce<number[]>(
    (acc, event) => [...acc, (acc[acc.length - 1] ?? 0) + event.duration],
    [],
  );
  // Bloc 82/A review (Codex PR #99): the events' own total only has to be
  // AT MOST the season length (parseLeagueData rejects overrun, never
  // requires an exact match) — a season can legitimately end later than
  // its last event. seasonDurationDays is added on its own, independent
  // of the events' cumulative duration, so the season's true end is
  // always labeled even when it doesn't coincide with the last event's.
  const transitionDays = new Set<number>([
    0,
    ...cumulativeHoursAfterEachEvent.map((hours) => hours / 24),
    seasonDurationDays,
  ]);
  // Bloc 82/B: the scale itself now covers every day of the season, not
  // just the transition days — a thin unlabeled tick for a plain day, kept
  // for continuity ("effet règle graduée"), and the labeled Jx tick only
  // at an actual transition (transitionDays above).
  const dayTicks = Array.from({ length: seasonDurationDays + 1 }, (_, day) => ({
    day,
    left: (day / seasonDurationDays) * 100,
    isTransition: transitionDays.has(day),
  }));
  return (
    <div className="events-timeline" role="img" aria-label={ariaLabel}>
      <div className="events-timeline-axis" />
      {segments.map(({ event, index, left, width }) => {
        const side = index % 2 === 0 ? "above" : "below";
        // Bloc 80/F: the admin's own manual pick (replaces Bloc 79/G's
        // auto-derivation from the name — abandoned) — 2 occurrences of
        // the same event still share a color when the admin gives them
        // the same one on purpose (cdc example: "Architecte" 72h/24h).
        const shade = eventColorVar(event.color);
        return (
          <div key={index}>
            <div
              className="events-timeline-segment"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: shade,
              }}
              title={`${event.name} — ${common("duration-hours", { hours: event.duration })}`}
              data-testid={`events-timeline-segment-${index}`}
            />
            <div
              className="events-timeline-marker"
              style={{ left: `${left + width / 2}%` }}
            >
              <div
                className={`events-timeline-label events-timeline-label-${side}`}
                // Bloc 80/G: proportional to this segment's own share of
                // the season instead of a flat cap (see
                // timelineLabelMaxWidthRem's own comment, lib/events.ts).
                style={{ maxWidth: `${timelineLabelMaxWidthRem(width)}rem` }}
              >
                {/* Bloc 81/A: the duration used to repeat here too — now
                    redundant since the tile below already shows it
                    (Bloc 81/F), so the segment's own label is just the
                    name. Bloc 81/D: written in the event's own chosen
                    color — Bloc 81/D review (Codex PR #98): via
                    eventTextColorVar, a theme-aware safe read of that
                    same hue, not the vivid theme-invariant swatch value
                    itself (illegible as text on the light theme's own
                    light backgrounds). */}
                <div
                  className="events-timeline-name"
                  style={{ color: eventTextColorVar(event.color) }}
                >
                  {event.name}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="events-timeline-scale" aria-hidden="true">
        {dayTicks.map(({ day, left, isTransition }) => (
          <div
            key={day}
            className="events-timeline-tick-group"
            style={{ left: `${left}%` }}
            data-testid={`events-timeline-tick-${day}`}
          >
            <div className="events-timeline-tick" />
            {isTransition && (
              <div className="events-timeline-tick-label">
                {day === 0 ? t("day-zero") : t("day-plus", { day })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Bloc 79/I: revises Bloc 60's plain collapsible block into a tile — same
// grey-card treatment as Boutique's own tiles (.consumable-tile), minus the
// image (events carry none) and with 2 highlighted badges instead of
// Boutique's single cost badge. The tile itself IS the collapsible unit
// (a <details>, its <summary> holding title + badges + description so
// they stay visible closed — Bloc 79/F), not a separate element wrapping
// one. Deliberately its own classes rather than literally reusing
// .consumable-tile: this repo's own history (Blocs 38/Q, 40/B, 41/E, 53/B,
// C, 76/A, 78/B) is a repeated lesson that a same-value class shared
// across 2 different features is exactly what breaks the next time either
// one changes independently.
function EventTile({
  event,
  startDay,
  endDay,
  t,
  locale,
}: {
  event: EventRow;
  startDay: number;
  endDay: number;
  t: (key: string, values?: Record<string, string | number>) => string;
  locale: string;
}) {
  const common = useTranslations("common");
  const description = pickFrEn(
    event.description_fr,
    event.description_en,
    locale,
  );
  const lastTier = event.tiers[event.tiers.length - 1];
  const finalObjective = lastTier
    ? pickFrEn(lastTier.objective_fr, lastTier.objective_en, locale)
    : null;
  return (
    <details className="events-tile">
      <summary className="events-tile-summary">
        <div className="events-tile-heading">
          {/* Bloc 80/F: the tile's own background stays grey (unchanged) —
              only the name is written in the event's chosen color, the
              visual link back to its timeline segment above. Bloc 81/D
              review (Codex PR #98): via eventTextColorVar — see its
              comment in events-reference.tsx's timeline segment above. */}
          <strong
            className="events-tile-name"
            style={{ color: eventTextColorVar(event.color) }}
          >
            {event.name}
          </strong>
          <div className="events-tile-badges">
            {finalObjective && (
              <span className="events-tile-badge events-tile-badge-objective">
                {finalObjective}
              </span>
            )}
            {/* Bloc 81/F: "Jx-Jy (durée)" — the days come from this
                event's own position in the chain (cumulative duration of
                everything before it), not stored data. */}
            <span className="events-tile-badge events-tile-badge-duration">
              {t("duration-badge", {
                start: startDay,
                end: endDay,
                duration: common("duration-hours", { hours: event.duration }),
              })}
            </span>
          </div>
        </div>
        {description && (
          <p className="events-tile-description">{description}</p>
        )}
      </summary>
      {event.tiers.length === 0 ? (
        <p className="admin-empty">{t("no-tiers")}</p>
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table reference-simple-table">
            <thead>
              <tr>
                <th>{t("columns.objective")}</th>
                <th>{t("columns.reward")}</th>
              </tr>
            </thead>
            <tbody>
              {event.tiers.map((tier, index) => (
                <tr key={index}>
                  <td>
                    {pickFrEn(tier.objective_fr, tier.objective_en, locale)}
                  </td>
                  <td>{pickFrEn(tier.reward_fr, tier.reward_en, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

// Bloc 60: the 7th reference — league buttons (Bloc 61 pattern, synced to
// Player Settings via useSyncedLeague, same as Level Up/Classement) at the
// top, then that league's own fully independent event list.
// Bloc 77/D: the timeline visual sits above that list, built from the same
// league data (events + seasonDurationDays).
// Bloc 79/I: below the timeline, a 2-per-row (1 on mobile) tile grid in
// chronological order replaces Bloc 60's plain collapsible-block list —
// same coloring/layout family as Boutique's own tile grid, for visual
// consistency across référentiels now that every one of them (Boutique,
// Templiers, Gemmes, this) is tile-based.
export function EventsReferenceTable({ catalog }: { catalog: EventsCatalog }) {
  const t = useTranslations("references.events");
  const locale = useLocale();
  const [league, setLeague] = useSyncedLeague();
  const leagueData = league ? catalog[league] : null;
  const events = leagueData?.events ?? [];
  // Bloc 81/F: each tile's own "Jx-Jy" range — cumulative duration of
  // every event before it, in days (always whole, every duration is a
  // multiple of 24h), same running-total principle as EventTimeline's own
  // segments above.
  const eventDayRanges = events.reduce<{
    cumulativeHours: number;
    items: Array<{ event: EventRow; startDay: number; endDay: number }>;
  }>(
    (acc, event) => {
      const startDay = acc.cumulativeHours / 24;
      const cumulativeHours = acc.cumulativeHours + event.duration;
      return {
        cumulativeHours,
        items: [
          ...acc.items,
          { event, startDay, endDay: cumulativeHours / 24 },
        ],
      };
    },
    { cumulativeHours: 0, items: [] },
  ).items;

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <LeagueButtons
          label={t("league")}
          value={league}
          onChange={setLeague}
          className="league-buttons-grid league-buttons-half"
        />
      </section>
      {!league ? (
        <p className="empty-state" role="status">
          {t("select-league")}
        </p>
      ) : events.length === 0 ? (
        <p className="empty-state" role="status">
          {t("empty")}
        </p>
      ) : (
        <>
          <EventTimeline
            events={events}
            seasonDurationDays={leagueData!.seasonDurationDays}
            ariaLabel={t("timeline-label")}
          />
          <div className="events-tile-grid">
            {eventDayRanges.map(({ event, startDay, endDay }, index) => (
              <EventTile
                event={event}
                startDay={startDay}
                endDay={endDay}
                t={t}
                locale={locale}
                key={index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
