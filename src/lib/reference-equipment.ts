import { combatEquipmentData, expeditionEquipmentData } from "./equipment-data";
import { equipmentStarIncrement, type EquipmentSkill } from "./equipment";

export type CombatReferenceRow = {
  rarity: string;
  set_name: string;
  family: string;
  skydust: string;
  gem_slots: string;
  slot_type: string;
  slot_name: string;
  skill_1: string;
  value_1_pct: string;
  skill_2: string;
  value_2_pct: string;
  skill_3: string;
  value_3_pct: string;
  skill_4: string;
  value_4_pct: string;
};
export type ExpeditionReferenceRow = (typeof expeditionEquipmentData)[number];

export const combatReferenceRows =
  combatEquipmentData as readonly CombatReferenceRow[];
export const expeditionReferenceRows = expeditionEquipmentData;

export function combatValueAtStar(
  skill: string,
  raw: string,
  star: number,
): number | null {
  const base = Number(raw);
  if (!raw || !Number.isFinite(base) || !(skill in equipmentStarIncrement))
    return null;
  return (
    base +
    equipmentStarIncrement[skill as EquipmentSkill] *
      (Math.max(1, Math.min(8, star)) - 1)
  );
}

export const confirmedExpeditionIncrements: Record<string, number> = {
  Équipement: 0.2,
  Vitalité: 2.5,
};

export function expeditionValueAtStar(stat: string, raw: string, star: number) {
  const base = Number(raw);
  if (!raw || !Number.isFinite(base)) return { value: null, confirmed: false };
  const safeStar = Math.max(1, Math.min(8, star));
  const increment = confirmedExpeditionIncrements[stat];
  return increment === undefined
    ? { value: base * safeStar, confirmed: false }
    : { value: base + increment * (safeStar - 1), confirmed: true };
}

export function missingCombatRows(
  rows: readonly CombatReferenceRow[] = combatReferenceRows,
) {
  return rows.filter((row) => row.skill_1 === "Inconnu");
}

export function applyCombatOverrides(
  rows: readonly CombatReferenceRow[],
  overrides: readonly Partial<CombatReferenceRow>[],
) {
  const byKey = new Map(
    overrides.map((row) => [
      `${row.rarity}|${row.set_name}|${row.slot_type}`,
      row,
    ]),
  );
  return rows.map((row) => ({
    ...row,
    ...(byKey.get(`${row.rarity}|${row.set_name}|${row.slot_type}`) ?? {}),
  }));
}
