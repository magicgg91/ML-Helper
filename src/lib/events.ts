import { leagues, type League } from "./player-settings";

// Bloc 60: each tier is 2 free-text fields (Objectif, Récompense) — same
// principle as the Classement reference's tier rewards (cdc), never
// structured into sub-fields since the unit/composition varies too much
// from one event to another (troops vs. gold, single reward vs. a mix of
// gold/sapphires/reskill/speedup/season currency).
export type EventTierRow = {
  objective: string;
  reward: string;
};

export const emptyEventTierRow: EventTierRow = { objective: "", reward: "" };

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
