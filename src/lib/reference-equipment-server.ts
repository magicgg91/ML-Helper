import { prisma } from "./prisma";
import {
  applyCombatOverrides,
  combatReferenceRows,
  defaultExpeditionMergeCostBase,
  defaultExpeditionStarIncrements,
  expeditionReferenceRows,
  parseExpeditionMergeCostBase,
  parseExpeditionStarIncrements,
  type CombatReferenceRow,
  type ExpeditionMergeCostBase,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "./reference-equipment";

export const referenceKeys = {
  combat: "combat_equipment",
  expedition: "expedition_equipment",
  expeditionIncrements: "expedition_equipment_star_increments",
  expeditionMergeCost: "expedition_equipment_merge_cost",
} as const;

async function rowsFor<T>(key: string, fallback: readonly T[]): Promise<T[]> {
  const table = await prisma.referenceTable.findUnique({ where: { key } });
  return Array.isArray(table?.rows) ? (table.rows as T[]) : [...fallback];
}

export function getCombatReferenceRows(): Promise<CombatReferenceRow[]> {
  return getCombatRowsWithLegacyFallback();
}

async function getCombatRowsWithLegacyFallback(): Promise<
  CombatReferenceRow[]
> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.combat },
  });
  if (Array.isArray(table?.rows)) return table.rows as CombatReferenceRow[];
  const legacy = await prisma.referenceTable.findUnique({
    where: { key: "combat_equipment_overrides" },
  });
  return Array.isArray(legacy?.rows)
    ? applyCombatOverrides(
        combatReferenceRows,
        legacy.rows as unknown as Partial<CombatReferenceRow>[],
      )
    : [...combatReferenceRows];
}

export function getExpeditionReferenceRows(): Promise<
  ExpeditionReferenceRow[]
> {
  return rowsFor(referenceKeys.expedition, expeditionReferenceRows);
}

export async function getExpeditionStarIncrements(): Promise<ExpeditionStarIncrements> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.expeditionIncrements },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseExpeditionStarIncrements(stored)
    : { ...defaultExpeditionStarIncrements };
}

export async function getExpeditionMergeCostBase(): Promise<ExpeditionMergeCostBase> {
  const table = await prisma.referenceTable.findUnique({
    where: { key: referenceKeys.expeditionMergeCost },
  });
  const stored = Array.isArray(table?.rows) ? table.rows[0] : undefined;
  return stored
    ? parseExpeditionMergeCostBase(stored)
    : { ...defaultExpeditionMergeCostBase };
}
