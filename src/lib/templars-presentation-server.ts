import { prisma } from "./prisma";
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

function normalizeRow(raw: unknown, key: TemplarKey): TemplarPresentationRow {
  if (!isPlainObject(raw)) return defaultTemplarPresentationCatalog[key];
  return {
    image: typeof raw.image === "string" ? raw.image : "",
    name_fr: typeof raw.name_fr === "string" ? raw.name_fr : "",
    name_en: typeof raw.name_en === "string" ? raw.name_en : "",
    description_fr:
      typeof raw.description_fr === "string" ? raw.description_fr : "",
    description_en:
      typeof raw.description_en === "string" ? raw.description_en : "",
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
