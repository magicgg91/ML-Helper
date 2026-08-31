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
  return valueAtStar(
    base,
    equipmentStarIncrement[skill as EquipmentSkill],
    star,
  );
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
export const mergeCostRarityKeys = [
  "Commun",
  "Rare",
  "Épique",
  "Mythique",
  "Légendaire",
] as const;
export type MergeCostRarityKey = (typeof mergeCostRarityKeys)[number];
export type ExpeditionMergeCostBase = Record<MergeCostRarityKey, number>;

export const defaultExpeditionMergeCostBase: ExpeditionMergeCostBase = {
  Commun: 600,
  Rare: 1100,
  Épique: 2000,
  Mythique: 4000,
  Légendaire: 8000,
};

function parseRarityBase<T extends Record<MergeCostRarityKey, number>>(
  value: unknown,
  defaults: T,
): T {
  const source: Partial<T> =
    value && typeof value === "object" ? (value as Partial<T>) : {};
  return Object.fromEntries(
    mergeCostRarityKeys.map((key) => {
      const parsed = Number(source[key]);
      // AGENTS.md: absolute quantities (Terradust/Pouciel/gem-slots costs,
      // not percentages) round to an integer — the input's step=1 is only
      // a soft browser hint, not enforced against a submitted payload.
      return [
        key,
        Number.isFinite(parsed) && parsed >= 0
          ? Math.round(parsed)
          : defaults[key],
      ];
    }),
  ) as T;
}

export function parseExpeditionMergeCostBase(
  value: unknown,
): ExpeditionMergeCostBase {
  return parseRarityBase(value, defaultExpeditionMergeCostBase);
}

// Bloc 42/A: Combat's Pouciel merge cost — Coût(rareté, n) = K(rareté) ×
// 2^(n-1), same principle as expeditionMergeCost() below, K entièrement
// confirmée (cdc 7.1, données joueur transition 1★→2★, doublement exact à
// chaque palier de rareté). Distinct from CombatSkydustBase just below
// (Pouciel "à la destruction" — a different, unrelated quantity that was
// already implemented; this merge-cost function/table never existed until
// this bloc, per the 29/08/2026 audit).
export type CombatMergeCostBase = Record<MergeCostRarityKey, number>;

export const defaultCombatMergeCostBase: CombatMergeCostBase = {
  Commun: 20,
  Rare: 40,
  Épique: 80,
  Mythique: 160,
  Légendaire: 320,
};

export function parseCombatMergeCostBase(value: unknown): CombatMergeCostBase {
  return parseRarityBase(value, defaultCombatMergeCostBase);
}

export function combatMergeCost(
  rarity: string,
  star: number,
  base: CombatMergeCostBase = defaultCombatMergeCostBase,
): number | null {
  const rarityBase = base[rarity as MergeCostRarityKey];
  if (rarityBase === undefined) return null;
  return rarityBase * 2 ** (Math.max(1, star) - 1);
}

// Bloc 35/6.1: Combat's Pouciel-per-rarity, promoted from the hardcoded
// equipmentRarityDerived lookup to genuine admin config, mirroring
// ExpeditionMergeCostBase exactly — same 5 rarity keys, same shape. The cdc
// 7.1 values (already confirmed) become the defaults.
export type CombatSkydustBase = Record<MergeCostRarityKey, number>;
export const defaultCombatSkydustBase: CombatSkydustBase = {
  Commun: 3,
  Rare: 10,
  Épique: 30,
  Mythique: 120,
  Légendaire: 160,
};
export function parseCombatSkydustBase(value: unknown): CombatSkydustBase {
  return parseRarityBase(value, defaultCombatSkydustBase);
}

// Bloc 35/6.1: Combat's gem-slots-per-rarity, same treatment.
export type CombatGemSlotsBase = Record<MergeCostRarityKey, number>;
export const defaultCombatGemSlotsBase: CombatGemSlotsBase = {
  Commun: 0,
  Rare: 0,
  Épique: 1,
  Mythique: 2,
  Légendaire: 3,
};
export function parseCombatGemSlotsBase(value: unknown): CombatGemSlotsBase {
  return parseRarityBase(value, defaultCombatGemSlotsBase);
}

// Bloc 35/5.2: Expedition's Terradust-on-dismantle-per-rarity. The cdc
// lists these as "reste à définir" (unlike the merge-cost K values, which
// are confirmed) — kept admin-editable with 0 as the default for every
// rarity until an admin fills in the real values (AGENTS.md: unconfirmed
// data stays editable with its current value as the default).
export type ExpeditionDismantleBase = Record<MergeCostRarityKey, number>;
export const defaultExpeditionDismantleBase: ExpeditionDismantleBase = {
  Commun: 0,
  Rare: 0,
  Épique: 0,
  Mythique: 0,
  Légendaire: 0,
};
export function parseExpeditionDismantleBase(
  value: unknown,
): ExpeditionDismantleBase {
  return parseRarityBase(value, defaultExpeditionDismantleBase);
}

export function expeditionMergeCost(
  rarity: string,
  star: number,
  base: ExpeditionMergeCostBase = defaultExpeditionMergeCostBase,
): number | null {
  const rarityBase = base[rarity as MergeCostRarityKey];
  if (rarityBase === undefined) return null;
  return rarityBase * 2 ** (Math.max(1, star) - 1);
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
