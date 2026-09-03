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

// Bloc 80/F: revises Bloc 79/G's auto-derived-from-name timeline color
// (abandoned) — an admin now picks each event's color explicitly from this
// fixed palette, via a dedicated button (never a color field's free-form
// value), so 2 similar events (cdc example: "Architecte" 72h then 24h) can
// share a color on purpose instead of relying on their names hashing the
// same way. 5 base hues x 2 shades (bright/base) = 10 options.
// Bloc 81/B review: Bloc 80 drew these from the site's shared accent tokens
// (--violet, --emerald, etc.) — reasonable in principle, but those tokens
// are tuned for their OWN uses elsewhere (accent, success, badges) and
// read as too dark/muted for a picker whose whole job is 10 visually
// distinct, vivid swatches. Dedicated --event-* tokens (globals.css) let
// this palette be genuinely bright without touching the shared ones — the
// identifiers below are unchanged (still used as i18n keys too), only
// eventColorVar's own CSS variable now points at the new namespace.
export const eventColors = [
  "violet",
  "violet-bright",
  "emerald",
  "emerald-bright",
  "amber",
  "amber-bright",
  "ember",
  "ember-bright",
  "sapphire",
  "sapphire-bright",
] as const;
export type EventColor = (typeof eventColors)[number];

export function eventColorVar(color: EventColor): string {
  return `var(--event-${color})`;
}

// Bloc 77/A: Description is admin free text at the event level (distinct
// from each tier's own Objectif/Récompense) — same fr/en-per-field
// convention as EventTierRow above, for the same AGENTS.md reason.
export type EventRow = {
  name: string;
  description_fr: string;
  description_en: string;
  duration: EventDuration;
  color: EventColor;
  tiers: EventTierRow[];
};

export const emptyEventRow: EventRow = {
  name: "",
  description_fr: "",
  description_en: "",
  duration: eventDurations[0],
  color: eventColors[0],
  tiers: [],
};

// Bloc 77/C: each league's own season length in days, admin-editable —
// never hardcoded, since it's the denominator the timeline visual
// (Bloc 77/D) uses to size every event's segment proportionally, and a
// league's season can differ (cdc: Bronze runs 21 days with none of this
// back-to-back-event mechanic, Argent-Légende run 14). Bronze still gets
// its own editable value for consistency; the timeline simply has nothing
// to draw for a league with no events yet.
// Bloc 79 review (Codex PR #96): the public timeline (Bloc 79/D) generates
// one tick element per day of this value on every render — shared between
// the admin editor (client-side cap) and the PUT route (the real boundary)
// so an unbounded/typo'd season length (1000000, say) can't blow up that
// render. 366 covers any real season (cdc's longest is 21 days).
export const maxSeasonDurationDays = 366;

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

// Bloc 77 review (Codex PR #95): events chain back-to-back with no gaps, so
// a league whose events add up to more than its own season length would
// overflow past 100% on the timeline (Bloc 77/D) — both the admin editor
// and the PUT route use this to reject that state before it can be saved.
export function totalEventHours(events: readonly EventRow[]): number {
  return events.reduce((sum, event) => sum + event.duration, 0);
}

// Bloc 80/G: the timeline label's max-width, in rem, adaptive to the
// event's own share of the season instead of Bloc 79/E's flat 9rem cap —
// "privilégier l'agrandissement de la zone de texte... avant de basculer
// sur 2 lignes" (cdc): a wide segment (a 72h event in a typical 14-day
// season, e.g. ~21% width) gets a box roomy enough for most names to stay
// on 1 line, while a narrow one (a 24h event in Bronze's 21-day season,
// ~5% width) still gets a readable floor. -webkit-line-clamp: 2
// (globals.css, .events-timeline-name) is the hard cap for whatever still
// doesn't fit — this function only ever influences whether it needs to.
export function timelineLabelMaxWidthRem(segmentWidthPercent: number): number {
  return Math.min(15, Math.max(4.5, segmentWidthPercent * 0.55));
}

export const emptyEventsCatalog: EventsCatalog = Object.fromEntries(
  leagues.map((league) => [
    league,
    {
      seasonDurationDays: defaultSeasonDurationDays[league],
      events: [] as EventRow[],
    },
  ]),
) as EventsCatalog;
