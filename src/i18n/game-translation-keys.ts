import type {
  EquipmentFamily,
  EquipmentRarity,
  EquipmentSkill,
  EquipmentSlot,
} from "@/lib/equipment";

export const equipmentFamilyTranslationKeys: Record<
  EquipmentFamily,
  "attack" | "defense" | "gold" | "troops-speed"
> = {
  Attaque: "attack",
  Défense: "defense",
  Or: "gold",
  "Troupes/Vitesse": "troops-speed",
};

export const equipmentRarityTranslationKeys: Record<
  EquipmentRarity,
  "common" | "rare" | "epic" | "mythic" | "legendary"
> = {
  Commun: "common",
  Rare: "rare",
  Épique: "epic",
  Mythique: "mythic",
  Légendaire: "legendary",
};

export const equipmentSkillTranslationKeys: Record<
  EquipmentSkill,
  | "striker"
  | "brave"
  | "scavenger"
  | "guardian"
  | "fearless"
  | "prosperous"
  | "recruiter"
  | "cautious"
  | "salvager"
  | "rusher"
> = {
  Attaque: "striker",
  Bravoure: "brave",
  Charognard: "scavenger",
  Défense: "guardian",
  Intrépide: "fearless",
  Prospérité: "prosperous",
  Recruteur: "recruiter",
  Récupération: "cautious",
  Recycleur: "salvager",
  Vitesse: "rusher",
};

export const equipmentSlotTranslationKeys: Record<
  EquipmentSlot,
  | "amulet"
  | "helmet"
  | "bracelet"
  | "ring"
  | "belt"
  | "gauntlet"
  | "weapon"
  | "boots"
  | "shield"
> = {
  Amulette: "amulet",
  Casque: "helmet",
  Bracelet: "bracelet",
  Anneau: "ring",
  Ceinture: "belt",
  Gantelet: "gauntlet",
  Arme: "weapon",
  Bottes: "boots",
  Bouclier: "shield",
};
