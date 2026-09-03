"use client";

import { useLocale, useTranslations } from "next-intl";
import { LeagueButtons } from "./league-select";
import { useSyncedLeague } from "./use-synced-league";
import type { EventRow, EventsCatalog } from "../lib/events";

// Bloc 60 review (Codex PR #81): same fr/en fallback as Consommables'
// pickLocaleText (Bloc44-review/C) — fr visitors get the French text (or
// English if it's the only one filled in), every other locale gets English
// (or French as a last resort), never a raw missing string.
function pickLocaleText(fr: string, en: string, locale: string): string {
  return locale === "fr" ? fr || en : en || fr;
}

// Bloc 77/D: a small rotating palette of theme-aware accent colors (same
// CSS custom properties used elsewhere, so it already adapts to both
// themes) — events carry no promotion/stay/relegation-style category the
// way Ranking's bands do (rankCategoryShade, src/lib/ranking.ts), so a
// simple index-based rotation is enough to tell adjacent segments apart.
const timelineShades = [
  "var(--violet)",
  "var(--emerald)",
  "var(--gold)",
  "var(--ember)",
  "var(--amber)",
];

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
  return (
    <div className="events-timeline" aria-label={ariaLabel}>
      <div className="events-timeline-axis" />
      {segments.map(({ event, index, left, width }) => {
        const side = index % 2 === 0 ? "above" : "below";
        return (
          <div key={index}>
            <div
              className="events-timeline-segment"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: timelineShades[index % timelineShades.length],
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
    </div>
  );
}

function EventCard({
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
  return (
    <details className="events-card">
      <summary className="events-card-summary">
        <span className="events-card-name">{event.name}</span>
        <span className="events-card-duration">
          {common("duration-hours", { hours: event.duration })}
        </span>
      </summary>
      {description && <p className="events-card-description">{description}</p>}
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
// top, then that league's own fully independent event list, each event a
// collapsible block (closed by default) revealing its tier table.
// Bloc 77/D: the timeline visual sits above that list, built from the same
// league data (events + seasonDurationDays).
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
          <div className="events-list">
            {events.map((event, index) => (
              <EventCard event={event} t={t} locale={locale} key={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
