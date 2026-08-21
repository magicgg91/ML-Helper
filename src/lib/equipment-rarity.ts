import type { EquipmentRarity } from "./equipment";

export const equipmentRarityValues: readonly EquipmentRarity[] = [
  "Commun", "Rare", "Épique", "Mythique", "Légendaire",
];

export const equipmentRarityDerived: Record<EquipmentRarity, { gemSlots: number; skydust: number }> = {
  Commun: { gemSlots: 0, skydust: 3 },
  Rare: { gemSlots: 0, skydust: 10 },
  Épique: { gemSlots: 1, skydust: 30 },
  Mythique: { gemSlots: 2, skydust: 120 },
  Légendaire: { gemSlots: 3, skydust: 160 },
};

export function derivedEquipmentValues(rarity: string) {
  return equipmentRarityDerived[rarity as EquipmentRarity] ?? { gemSlots: 0, skydust: 0 };
}

