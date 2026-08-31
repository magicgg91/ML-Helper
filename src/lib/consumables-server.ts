import { prisma } from "./prisma";
import {
  consumablesIntroKey,
  defaultConsumableRows,
  defaultConsumablesIntro,
  type ConsumableRow,
} from "./consumables";
import { translationRecord } from "./translations";

export const consumablesReferenceKey = "consumables";

export async function getConsumableRows(): Promise<ConsumableRow[]> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: consumablesReferenceKey },
  });
  return Array.isArray(table?.rows)
    ? (table.rows as ConsumableRow[])
    : [...defaultConsumableRows];
}

export async function getConsumablesIntro(): Promise<{
  fr: string;
  en: string;
}> {
  const content = await prisma.staticContent.findUnique({
    where: { key: consumablesIntroKey },
  });
  const translations = translationRecord(content?.content);
  return {
    fr: translations.fr ?? defaultConsumablesIntro.fr,
    en: translations.en ?? defaultConsumablesIntro.en,
  };
}
