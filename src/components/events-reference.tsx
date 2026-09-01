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

function EventCard({
  event,
  t,
  locale,
}: {
  event: EventRow;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <details className="events-card">
      <summary className="events-card-summary">
        <span className="events-card-name">{event.name}</span>
        {(event.startDay || event.endDay) && (
          <span className="events-card-duration">
            {event.startDay}
            {event.startDay && event.endDay ? " – " : ""}
            {event.endDay}
          </span>
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
// top, then that league's own fully independent event list, each event a
// collapsible block (closed by default) revealing its tier table.
export function EventsReferenceTable({ catalog }: { catalog: EventsCatalog }) {
  const t = useTranslations("references.events");
  const locale = useLocale();
  const [league, setLeague] = useSyncedLeague();
  const events = league ? catalog[league] : [];

  return (
    <div className="calculator-stack">
      <section className="calculator-card">
        <LeagueButtons label={t("league")} value={league} onChange={setLeague} />
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
        <div className="events-list">
          {events.map((event, index) => (
            <EventCard event={event} t={t} locale={locale} key={index} />
          ))}
        </div>
      )}
    </div>
  );
}
