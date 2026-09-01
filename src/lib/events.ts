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

// An event's own duration is 2 free-text fields too (day range or a plain
// duration string) rather than real dates — Million Lords events are
// scheduled by in-season day number, not a calendar date.
export type EventRow = {
  name: string;
  startDay: string;
  endDay: string;
  tiers: EventTierRow[];
};

export const emptyEventRow: EventRow = {
  name: "",
  startDay: "",
  endDay: "",
  tiers: [],
};

// Bloc 60: entirely independent per league — order, duration, and the
// whole event list itself, not just which tiers/rewards apply. No data is
// ever shared between leagues.
export type EventsCatalog = Record<League, EventRow[]>;

export const emptyEventsCatalog: EventsCatalog = Object.fromEntries(
  leagues.map((league) => [league, [] as EventRow[]]),
) as EventsCatalog;
