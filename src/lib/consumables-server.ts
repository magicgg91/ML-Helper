import { prisma } from "./prisma";
import {
  consumableCategories,
  consumablePotionNames,
  consumablesIntroKey,
  defaultConsumableCatalog,
  defaultConsumablesIntro,
  parseConsumableCategory,
  type ConsumableCatalog,
  type ConsumableRow,
} from "./consumables";
import {
  launchRecord,
  translationRecord,
  type LaunchLocale,
} from "./translations";

export const consumablesReferenceKey = "consumables";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Bloc 48/E: potions move to "expedition" unconditionally — even an
// installation already migrated under Bloc46 (rows stored with an explicit
// category: "inventory") must have them relocated on next read, not just
// freshly-added ones. This override always wins over whatever category was
// previously recovered/stored.
function recoverCategory(row: {
  category?: unknown;
  name_fr?: unknown;
}): ReturnType<typeof parseConsumableCategory> {
  const nameFr = typeof row.name_fr === "string" ? row.name_fr : undefined;
  if (nameFr && consumablePotionNames.has(nameFr)) return "expedition";
  return parseConsumableCategory(row.category, nameFr);
}

// Bloc 48/B+E: tolerates every historical shape this data has been stored
// in — the new grouped-by-category object (passthrough, still re-homing
// potions in case of a manual DB edit); Bloc46's flat array with a
// `category` field per row (grouped by recovered category); and the
// original pre-Bloc46 flat array with no category field at all (recovered
// by name via parseConsumableCategory). Falls back to the compiled-in
// defaults only when nothing usable is stored.
export function normalizeStoredValue(value: unknown): ConsumableCatalog {
  if (Array.isArray(value)) {
    const grouped = Object.fromEntries(
      consumableCategories.map((category) => [category, [] as ConsumableRow[]]),
    ) as ConsumableCatalog;
    for (const raw of value) {
      if (!isPlainObject(raw)) continue;
      const row = { ...raw };
      delete row.category;
      grouped[recoverCategory(raw)].push(row as ConsumableRow);
    }
    return grouped;
  }
  if (isPlainObject(value)) {
    const grouped = Object.fromEntries(
      consumableCategories.map((category) => [category, [] as ConsumableRow[]]),
    ) as ConsumableCatalog;
    for (const category of consumableCategories) {
      const rawRows = value[category];
      if (!Array.isArray(rawRows)) continue;
      for (const raw of rawRows) {
        if (!isPlainObject(raw)) continue;
        const row = raw as ConsumableRow;
        // Codex review (PR #71): the grouped shape must re-home potions
        // too, not just the legacy flat-array path — a row saved via the
        // PUT endpoint (or a manual DB edit) under the wrong category
        // would otherwise never self-correct on later reads.
        const nameFr =
          typeof row.name_fr === "string" ? row.name_fr : undefined;
        const target =
          nameFr && consumablePotionNames.has(nameFr) ? "expedition" : category;
        grouped[target].push(row);
      }
    }
    return grouped;
  }
  return defaultConsumableCatalog;
}

export async function getConsumableCatalog(): Promise<ConsumableCatalog> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: consumablesReferenceKey },
  });
  if (!table) return defaultConsumableCatalog;
  return normalizeStoredValue(table.rows);
}

// Bloc 44: only fr/en have a (empty) fallback in defaultConsumablesIntro —
// DE/ES/TR simply have nothing until an admin writes it, same as a
// never-saved fr/en would.
export async function getConsumablesIntro(): Promise<
  Record<LaunchLocale, string>
> {
  const content = await prisma.staticContent.findUnique({
    where: { key: consumablesIntroKey },
  });
  const translations = translationRecord(content?.content);
  return launchRecord(
    (locale) =>
      translations[locale] ??
      (locale === "fr" || locale === "en"
        ? defaultConsumablesIntro[locale]
        : ""),
  );
}
