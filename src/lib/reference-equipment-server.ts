import { prisma } from "./prisma";
import {
  applyCombatOverrides,
  combatReferenceRows,
  missingCombatRows,
  type CombatReferenceRow,
} from "./reference-equipment";

const key = "combat_equipment_overrides";

export async function getCombatOverrides(): Promise<
  Partial<CombatReferenceRow>[]
> {
  const table = await prisma.referenceTable.findUnique({ where: { key } });
  return Array.isArray(table?.rows)
    ? (table.rows as Partial<CombatReferenceRow>[])
    : [];
}

export async function getPublicCombatRows() {
  return applyCombatOverrides(combatReferenceRows, await getCombatOverrides());
}

export async function getEditableCombatRows() {
  const overrides = await getCombatOverrides();
  return applyCombatOverrides(missingCombatRows(), overrides);
}

export { key as combatOverridesKey };
