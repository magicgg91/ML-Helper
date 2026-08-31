import { prisma } from "./prisma";
import {
  consumablesIntroKey,
  defaultConsumableRows,
  defaultConsumablesIntro,
  type ConsumableRow,
} from "./consumables";
import {
  launchRecord,
  translationRecord,
  type LaunchLocale,
} from "./translations";

export const consumablesReferenceKey = "consumables";

export async function getConsumableRows(): Promise<ConsumableRow[]> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: consumablesReferenceKey },
  });
  return Array.isArray(table?.rows)
    ? (table.rows as ConsumableRow[])
    : [...defaultConsumableRows];
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
