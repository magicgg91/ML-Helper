import { prisma } from "./prisma";
import { leagues } from "./player-settings";
import {
  emptyEventsCatalog,
  type EventRow,
  type EventsCatalog,
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
    leagues.map((league) => [league, [] as EventRow[]]),
  ) as EventsCatalog;
}

function normalizeTier(raw: unknown): EventTierRow | null {
  if (!isPlainObject(raw)) return null;
  return {
    objective_fr:
      typeof raw.objective_fr === "string" ? raw.objective_fr : "",
    objective_en:
      typeof raw.objective_en === "string" ? raw.objective_en : "",
    reward_fr: typeof raw.reward_fr === "string" ? raw.reward_fr : "",
    reward_en: typeof raw.reward_en === "string" ? raw.reward_en : "",
  };
}

function normalizeEvent(raw: unknown): EventRow | null {
  if (!isPlainObject(raw)) return null;
  const rawTiers = Array.isArray(raw.tiers) ? raw.tiers : [];
  return {
    name: typeof raw.name === "string" ? raw.name : "",
    startDay: typeof raw.startDay === "string" ? raw.startDay : "",
    endDay: typeof raw.endDay === "string" ? raw.endDay : "",
    tiers: rawTiers
      .map(normalizeTier)
      .filter((tier): tier is EventTierRow => tier !== null),
  };
}

export function normalizeStoredValue(value: unknown): EventsCatalog {
  if (!isPlainObject(value)) return emptyEventsCatalog;
  const grouped = freshEmptyCatalog();
  for (const league of leagues) {
    const rawEvents = value[league];
    if (!Array.isArray(rawEvents)) continue;
    grouped[league] = rawEvents
      .map(normalizeEvent)
      .filter((event): event is EventRow => event !== null);
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
