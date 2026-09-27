import { prisma } from "./prisma";
import { parseLocalizedFieldPair } from "./localized-field";
import { templarKeys, type TemplarKey } from "./player-settings";
import {
  defaultTemplarPresentationCatalog,
  type TemplarPresentationCatalog,
  type TemplarPresentationRow,
} from "./templars-presentation";

export const templarsPresentationReferenceKey = "templars-presentation";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Bloc 127 (PR 2/3): the name and the description are read per language, with
// the fr/en pair as the fallback for what the migration cannot reach — a backup
// restored from before it, an image that has not yet run. A net, not a
// migration: the data moves to the new shape once, in SQL.
function normalizeRow(raw: unknown, key: TemplarKey): TemplarPresentationRow {
  if (!isPlainObject(raw)) return defaultTemplarPresentationCatalog[key];
  return {
    image: typeof raw.image === "string" ? raw.image : "",
    name: parseLocalizedFieldPair(raw.name, {
      fr: raw.name_fr,
      en: raw.name_en,
    }),
    description: parseLocalizedFieldPair(raw.description, {
      fr: raw.description_fr,
      en: raw.description_en,
    }),
    temple_base: typeof raw.temple_base === "string" ? raw.temple_base : "",
    bonus: typeof raw.bonus === "string" ? raw.bonus : "",
  };
}

// Tolerates a stored value missing a key entirely (nothing saved yet) by
// falling back per-row to the seeded defaults — same shape-recovery
// pattern as every other reference table's normalizer.
export function normalizeStoredTemplarPresentation(
  value: unknown,
): TemplarPresentationCatalog {
  const source = isPlainObject(value) ? value : {};
  return Object.fromEntries(
    templarKeys.map((key) => [key, normalizeRow(source[key], key)]),
  ) as TemplarPresentationCatalog;
}

export async function getTemplarPresentation(): Promise<TemplarPresentationCatalog> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: templarsPresentationReferenceKey },
  });
  if (!table) return defaultTemplarPresentationCatalog;
  return normalizeStoredTemplarPresentation(table.rows);
}
