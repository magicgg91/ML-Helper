import type { EquipmentRarity } from "./equipment";

export const equipmentRarityValues: readonly EquipmentRarity[] = [
  "Commun",
  "Rare",
  "Épique",
  "Mythique",
  "Légendaire",
];

const diacritics = /\p{Diacritic}/gu;

export function rarityClassName(rarity: string): string {
  return rarity.toLowerCase().normalize("NFD").replace(diacritics, "");
}
