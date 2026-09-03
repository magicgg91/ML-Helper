"use client";

import { useLocale, useTranslations } from "next-intl";
import { LeagueButtons } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";
import {
  eventColorVar,
  timelineLabelMaxWidthRem,
  type EventRow,
  type EventsCatalog,
} from "../lib/events";

// Bloc 60 review (Codex PR #81): same fr/en fallback as Consommables'
// pickLocaleText (Bloc44-review/C) — fr visitors get the French text (or
// English if it's the only one filled in), every other locale gets English
// (or French as a last resort), never a raw missing string.
function pickLocaleText(fr: string, en: string, locale: string): string {
  return locale === "fr" ? fr || en : en || fr;
}

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
    items: Array<{ event: EventRow; index: number; left: number; width: number }>;
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
  // Bloc 79/D: a fine 24h-tick day scale under the segments. Anchored on
  // the season's own fixed length (day seasonDurationDays, at 100%) and
  // counted backward in 24h steps down to day 0 (0%) — the live game's
  // actual season opening is a variable 12-16h window, only its reset/end
  // is a fixed instant, so the end is the one point worth anchoring on
  // (this produces the same positions as counting forward from 0 here,
  // since seasonDurationDays is always a whole number of days, but keeps
  // the code honest about which end is actually fixed).
  const dayTicks = Array.from({ length: seasonDurationDays + 1 }, (_, i) => {
    const day = seasonDurationDays - i;
    const hoursFromEnd = i * 24;
    return { day, left: ((totalHours - hoursFromEnd) / totalHours) * 100 };
  });
  return (
    <div className="events-timeline" aria-label={ariaLabel}>
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
                <div className="events-timeline-name">{event.name}</div>
                <div className="events-timeline-duration">
                  {common("duration-hours", { hours: event.duration })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="events-timeline-scale" aria-hidden="true">
        {dayTicks.map(({ day, left }) => (
          <div
            key={day}
            className="events-timeline-tick-group"
            style={{ left: `${left}%` }}
            data-testid={`events-timeline-tick-${day}`}
          >
            <div className="events-timeline-tick" />
            <div className="events-timeline-tick-label">
              {day === 0 ? t("day-zero") : t("day-plus", { day })}
            </div>
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
  t,
  locale,
}: {
  event: EventRow;
  t: (key: string) => string;
  locale: string;
}) {
  const common = useTranslations("common");
  const description = pickLocaleText(
    event.description_fr,
    event.description_en,
    locale,
  );
  const lastTier = event.tiers[event.tiers.length - 1];
  const finalObjective = lastTier
    ? pickLocaleText(lastTier.objective_fr, lastTier.objective_en, locale)
    : null;
  return (
    <details className="events-tile">
      <summary className="events-tile-summary">
        <div className="events-tile-heading">
          {/* Bloc 80/F: the tile's own background stays grey (unchanged) —
              only the name is written in the event's chosen color, the
              visual link back to its timeline segment above. */}
          <strong
            className="events-tile-name"
            style={{ color: eventColorVar(event.color) }}
          >
            {event.name}
          </strong>
          <div className="events-tile-badges">
            {finalObjective && (
              <span className="events-tile-badge events-tile-badge-objective">
                {finalObjective}
              </span>
            )}
            <span className="events-tile-badge events-tile-badge-duration">
              {common("duration-hours", { hours: event.duration })}
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
                    {pickLocaleText(
                      tier.objective_fr,
                      tier.objective_en,
                      locale,
                    )}
                  </td>
                  <td>
                    {pickLocaleText(tier.reward_fr, tier.reward_en, locale)}
                  </td>
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

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <LeagueButtons
          label={t("league")}
          value={league}
          onChange={setLeague}
          className="league-buttons-grid"
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
            {events.map((event, index) => (
              <EventTile event={event} t={t} locale={locale} key={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
