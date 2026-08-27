import { combatEquipmentData, expeditionEquipmentData } from "./equipment-data";
import { equipmentStarIncrement, type EquipmentSkill } from "./equipment";
import { valueAtStar } from "./star-progression";

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
export type ExpeditionReferenceRow = {
  rarity: string;
  set_name: string;
  family: string;
  slot: string;
  type_stat_pct: string;
  secondary_stat_name: string;
  secondary_stat_pct: string;
};

export const combatReferenceRows =
  combatEquipmentData as readonly CombatReferenceRow[];
export const expeditionReferenceRows =
  expeditionEquipmentData as readonly ExpeditionReferenceRow[];

export function combatValueAtStar(
  skill: string,
  raw: string,
  star: number,
): number | null {
  const base = Number(raw);
  if (!raw || !Number.isFinite(base) || !(skill in equipmentStarIncrement))
    return null;
  return valueAtStar(base, equipmentStarIncrement[skill as EquipmentSkill], star);
}

// The 10 expedition stats (4 primary + 6 secondary), keyed the same way
// callers already strip the "_expé" disambiguation suffix off
// secondary_stat_name (see ExpeditionReferenceTable) before looking a stat
// up here — "Récupération"/"Vitesse", not "Récupération_expé"/"Vitesse_expé".
export const expeditionStatKeys = [
  "Or",
  "Troupes",
  "Équipement",
  "Consommables",
  "Vitalité",
  "Perception",
  "Récupération",
  "Vitesse",
  "Esquive",
  "Chance",
] as const;
export type ExpeditionStatKey = (typeof expeditionStatKeys)[number];
export type ExpeditionStarIncrements = Record<ExpeditionStatKey, number>;

// Confirmed at Légendaire, cross-validated at Commun for Or only (cdc
// 7.1). Applying the same increment to every rarity for the other 9 stats
// is an extrapolation, not itself confirmed at every rarity yet — kept
// admin-editable rather than locked in (AGENTS.md: unconfirmed data stays
// editable with its current value as the default).
export const defaultExpeditionStarIncrements: ExpeditionStarIncrements = {
  Or: 0.3,
  Troupes: 0.3,
  Équipement: 0.2,
  Consommables: 0.2,
  Vitalité: 2.5,
  Perception: 0.3,
  Récupération: 1,
  Vitesse: 1.3,
  Esquive: 0.3,
  Chance: 2.5,
};

export function parseExpeditionStarIncrements(
  value: unknown,
): ExpeditionStarIncrements {
  const source =
    value && typeof value === "object"
      ? (value as Partial<ExpeditionStarIncrements>)
      : {};
  return Object.fromEntries(
    expeditionStatKeys.map((key) => {
      const parsed = Number(source[key]);
      return [
        key,
        Number.isFinite(parsed) && parsed >= 0
          ? parsed
          : defaultExpeditionStarIncrements[key],
      ];
    }),
  ) as ExpeditionStarIncrements;
}

export function expeditionValueAtStar(
  stat: string,
  raw: string,
  star: number,
  increments: ExpeditionStarIncrements = defaultExpeditionStarIncrements,
): { value: number | null; confirmed: boolean } {
  const base = Number(raw);
  if (!raw || !Number.isFinite(base)) return { value: null, confirmed: false };
  const increment = increments[stat as ExpeditionStatKey];
  return increment === undefined
    ? { value: null, confirmed: false }
    : { value: valueAtStar(base, increment, star), confirmed: true };
}

// Terradust merge cost (cdc 7.1): Coût(rareté, n) = K(rareté) × 2^(n-1),
// n = starting star of the item being upgraded. Unlike Combat's Pouciel
// (a uniform ×2 per rarity tier), K does NOT double at a constant ratio
// between rarities here — load these 5 as independent confirmed constants,
// never recompute or generalize them from a ratio.
export const expeditionMergeCostBase: Record<string, number> = {
  Commun: 600,
  Rare: 1100,
  Épique: 2000,
  Mythique: 4000,
  Légendaire: 8000,
};

export function expeditionMergeCost(rarity: string, star: number): number | null {
  const base = expeditionMergeCostBase[rarity];
  if (base === undefined) return null;
  return base * 2 ** (Math.max(1, star) - 1);
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
