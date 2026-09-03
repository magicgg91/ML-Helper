import { leagues, type League } from "./player-settings";

// Bloc 60: each tier is 2 free-text fields (Objectif, Récompense) — same
// principle as the Classement reference's tier rewards (cdc), never
// structured into sub-fields since the unit/composition varies too much
// from one event to another (troops vs. gold, single reward vs. a mix of
// gold/sapphires/reskill/speedup/season currency).
// Bloc 60 review (Codex PR #81): same fr/en-per-field pattern as
// ConsumableRow's name_fr/name_en (Bloc 43/44-review C) — AGENTS.md
// requires every user-visible string to go through next-intl or, for
// admin-editable editorial content, a per-locale field with an English
// fallback. A single shared string would show French text verbatim to
// en/de/es/tr visitors.
export type EventTierRow = {
  objective_fr: string;
  objective_en: string;
  reward_fr: string;
  reward_en: string;
};

export const emptyEventTierRow: EventTierRow = {
  objective_fr: "",
  objective_en: "",
  reward_fr: "",
  reward_en: "",
};

// Bloc 77/B: events chain back-to-back with no gaps within a season (the
// next one starts exactly when the previous ends) — the deployable
// information about an event's timing is purely its own duration, never a
// calendar day/date. Fixed to 3 known values (cdc), not free text.
export const eventDurations = [24, 48, 72] as const;
export type EventDuration = (typeof eventDurations)[number];

// Bloc 77/A: Description is admin free text at the event level (distinct
// from each tier's own Objectif/Récompense) — same fr/en-per-field
// convention as EventTierRow above, for the same AGENTS.md reason.
export type EventRow = {
  name: string;
  description_fr: string;
  description_en: string;
  duration: EventDuration;
  tiers: EventTierRow[];
};

export const emptyEventRow: EventRow = {
  name: "",
  description_fr: "",
  description_en: "",
  duration: eventDurations[0],
  tiers: [],
};

// Bloc 77/C: each league's own season length in days, admin-editable —
// never hardcoded, since it's the denominator the timeline visual
// (Bloc 77/D) uses to size every event's segment proportionally, and a
// league's season can differ (cdc: Bronze runs 21 days with none of this
// back-to-back-event mechanic, Argent-Légende run 14). Bronze still gets
// its own editable value for consistency; the timeline simply has nothing
// to draw for a league with no events yet.
const defaultSeasonDurationDays: Record<League, number> = {
  bronze: 21,
  silver: 14,
  gold: 14,
  platinum: 14,
  diamond: 14,
  legend: 14,
};

// Bloc 77: a league's events are no longer the catalog's whole value — its
// season duration lives alongside the event list, both scoped per league
// (structure from the cdc: Ligue -> Durée de la saison + Liste d'Events).
export type EventsLeagueData = {
  seasonDurationDays: number;
  events: EventRow[];
};

// Bloc 60: entirely independent per league — order, duration, and the
// whole event list itself, not just which tiers/rewards apply. No data is
// ever shared between leagues.
export type EventsCatalog = Record<League, EventsLeagueData>;

export const emptyEventsCatalog: EventsCatalog = Object.fromEntries(
  leagues.map((league) => [
    league,
    {
      seasonDurationDays: defaultSeasonDurationDays[league],
      events: [] as EventRow[],
    },
  ]),
) as EventsCatalog;
