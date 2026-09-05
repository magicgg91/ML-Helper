import { rarityOrder, type EquipmentRarity } from "./equipment";
import {
  defaultExpeditionStarIncrements,
  expeditionValueAtStar,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "./reference-equipment";

// Grid order confirmed cdc section 7.1: row 1 Cape/Longue-vue/Bourse
// (Sacoche), row 2 Boussole/Torche/Pioche.
export const expeditionSlotLayout = [
  "Cape",
  "Longue-vue",
  "Sacoche",
  "Boussole",
  "Torche",
  "Pioche",
] as const;
export type ExpeditionSlot = (typeof expeditionSlotLayout)[number];

export type ExpeditionSelection = { rarity: string; setName: string };
export type ExpeditionSlotState = {
  equipment: ExpeditionSelection | null;
  star: number;
};
export type ExpeditionState = ExpeditionSlotState[];

export function createEmptyExpeditionState(): ExpeditionState {
  return expeditionSlotLayout.map(() => ({ equipment: null, star: 1 }));
}

// Bloc 31/E.1: "Personnalisé" (custom) keeps the full mixed-family catalog;
// the other 4 filters restrict every slot selector's catalog to a single
// primary-stat family at a time.
export const expeditionFamilyFilters = [
  "Or",
  "Équipement",
  "Consommables",
  "Troupes",
] as const;
export type ExpeditionFamilyFilter = (typeof expeditionFamilyFilters)[number];
export const expeditionFilterOrder = [
  "custom",
  ...expeditionFamilyFilters,
] as const;
export type ExpeditionFilter = (typeof expeditionFilterOrder)[number];

// Each filter keeps its own independent loadout (5 separate configurations)
// so switching filters never overwrites another filter's saved choices.
export type ExpeditionConfigs = Record<ExpeditionFilter, ExpeditionState>;

export function createEmptyExpeditionConfigs(): ExpeditionConfigs {
  return Object.fromEntries(
    expeditionFilterOrder.map((filter) => [
      filter,
      createEmptyExpeditionState(),
    ]),
  ) as ExpeditionConfigs;
}

export function expeditionOptions(
  slot: ExpeditionSlot,
  rows: readonly ExpeditionReferenceRow[],
  familyFilter?: ExpeditionFamilyFilter,
) {
  return rows
    .filter(
      (item) =>
        item.slot === slot && (!familyFilter || item.family === familyFilter),
    )
    .sort(
      (a, b) =>
        rarityOrder.indexOf(a.rarity as EquipmentRarity) -
        rarityOrder.indexOf(b.rarity as EquipmentRarity),
    );
}

export function findExpeditionEquipment(
  slot: ExpeditionSlot,
  selection: ExpeditionSelection | null,
  rows: readonly ExpeditionReferenceRow[],
) {
  if (!selection) return undefined;
  return rows.find(
    (item) =>
      item.slot === slot &&
      item.rarity === selection.rarity &&
      item.set_name === selection.setName,
  );
}

function add(
  total: Partial<Record<string, number>>,
  stat: string,
  value: number,
) {
  total[stat] = (total[stat] ?? 0) + value;
}

export function computeExpeditionSlot(
  slot: ExpeditionSlot,
  state: ExpeditionSlotState,
  rows: readonly ExpeditionReferenceRow[],
  increments: ExpeditionStarIncrements = defaultExpeditionStarIncrements,
): Partial<Record<string, number>> {
  const total: Partial<Record<string, number>> = {};
  const item = findExpeditionEquipment(slot, state.equipment, rows);
  if (!item) return total;
  const primary = expeditionValueAtStar(
    item.family,
    item.type_stat_pct,
    state.star,
    increments,
  );
  if (primary.value !== null) add(total, item.family, primary.value);
  if (item.secondary_stat_name) {
    const secondaryStat = item.secondary_stat_name.replace("_expé", "");
    const secondary = expeditionValueAtStar(
      secondaryStat,
      item.secondary_stat_pct,
      state.star,
      increments,
    );
    if (secondary.value !== null) add(total, secondaryStat, secondary.value);
  }
  return total;
}

export function computeExpeditionTotal(
  state: ExpeditionState,
  rows: readonly ExpeditionReferenceRow[],
  increments: ExpeditionStarIncrements = defaultExpeditionStarIncrements,
): Partial<Record<string, number>> {
  const total: Partial<Record<string, number>> = {};
  expeditionSlotLayout.forEach((slot, index) => {
    const slotState = state[index];
    if (!slotState) return;
    Object.entries(
      computeExpeditionSlot(slot, slotState, rows, increments),
    ).forEach(([stat, value]) => {
      if (value !== undefined) add(total, stat, value);
    });
  });
  return total;
}
