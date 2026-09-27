import { prisma } from "./prisma";
import { parseLocalizedFieldPair } from "./localized-field";
import { leagues } from "./player-settings";
import {
  emptyEventsCatalog,
  eventColors,
  eventDurations,
  type EventColor,
  type EventDuration,
  type EventRow,
  type EventsCatalog,
  type EventsLeagueData,
  type EventTierRow,
} from "./events";

export const eventsReferenceKey = "events";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A fresh set of arrays every call — emptyEventsCatalog itself is a shared
// module-level constant, so spreading it would leave every grouped result
// sharing (and mutating, via push) the very same array instances. Same fix
// as consumables-server.ts's freshEmptyCatalog (Bloc 58 regression).
function freshEmptyCatalog(): EventsCatalog {
  return Object.fromEntries(
    leagues.map((league) => [
      league,
      {
        seasonDurationDays: emptyEventsCatalog[league].seasonDurationDays,
        events: [] as EventRow[],
      },
    ]),
  ) as EventsCatalog;
}

// Bloc 127 (PR 3/3) : la lecture sert les deux formes — le champ par langue,
// et la paire FR/EN d'avant la migration. Le repli n'est pas un substitut à
// la migration mais son filet : une sauvegarde restaurée d'avant, ou une
// image déployée avant que le SQL n'ait tourné, rendraient sinon des paliers
// muets. Il part avec la migration, pas avec cette PR.
function normalizeTier(raw: unknown): EventTierRow | null {
  if (!isPlainObject(raw)) return null;
  return {
    objective: parseLocalizedFieldPair(raw.objective, {
      fr: raw.objective_fr,
      en: raw.objective_en,
    }),
    reward: parseLocalizedFieldPair(raw.reward, {
      fr: raw.reward_fr,
      en: raw.reward_en,
    }),
  };
}

function normalizeDuration(raw: unknown): EventDuration {
  const value = typeof raw === "number" ? raw : Number(raw);
  return (eventDurations as readonly number[]).includes(value)
    ? (value as EventDuration)
    : eventDurations[0];
}

// Bloc 80/F: rows saved before this bloc have no "color" field at all —
// falls back to the palette's first entry, same "first valid value"
// fallback normalizeDuration above already uses for a missing/invalid
// duration, instead of throwing on data that predates this column.
function normalizeColor(raw: unknown): EventColor {
  return (eventColors as readonly string[]).includes(raw as string)
    ? (raw as EventColor)
    : eventColors[0];
}

function normalizeEvent(raw: unknown): EventRow | null {
  if (!isPlainObject(raw)) return null;
  const rawTiers = Array.isArray(raw.tiers) ? raw.tiers : [];
  return {
    // Le nom était une chaîne unique, pas une paire : la relire comme du
    // français est ce qui la conserve. `parseLocalizedField` rend `{}` pour
    // une chaîne, donc la même fonction sert les deux formes — l'objet quand
    // il est là, l'ancienne chaîne sinon. Un visiteur allemand lisait déjà
    // ce texte tel quel ; il le lit maintenant par repli, au lieu de n'avoir
    // que lui.
    name: parseLocalizedFieldPair(raw.name, {
      fr: raw.name,
      en: undefined,
    }),
    description: parseLocalizedFieldPair(raw.description, {
      fr: raw.description_fr,
      en: raw.description_en,
    }),
    duration: normalizeDuration(raw.duration),
    color: normalizeColor(raw.color),
    tiers: rawTiers
      .map(normalizeTier)
      .filter((tier): tier is EventTierRow => tier !== null),
  };
}

function normalizeSeasonDurationDays(raw: unknown, fallback: number): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeLeagueData(raw: unknown, fallback: number): EventsLeagueData {
  if (!isPlainObject(raw)) return { seasonDurationDays: fallback, events: [] };
  const rawEvents = Array.isArray(raw.events) ? raw.events : [];
  return {
    seasonDurationDays: normalizeSeasonDurationDays(
      raw.seasonDurationDays,
      fallback,
    ),
    events: rawEvents
      .map(normalizeEvent)
      .filter((event): event is EventRow => event !== null),
  };
}

export function normalizeStoredValue(value: unknown): EventsCatalog {
  if (!isPlainObject(value)) return emptyEventsCatalog;
  const grouped = freshEmptyCatalog();
  for (const league of leagues) {
    grouped[league] = normalizeLeagueData(
      value[league],
      emptyEventsCatalog[league].seasonDurationDays,
    );
  }
  return grouped;
}

export async function getEventsCatalog(): Promise<EventsCatalog> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: eventsReferenceKey },
  });
  if (!table) return emptyEventsCatalog;
  return normalizeStoredValue(table.rows);
}
