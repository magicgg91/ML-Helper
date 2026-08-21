import type {
  EquipmentFamily,
  EquipmentRarity,
  EquipmentSkill,
  EquipmentSlot,
} from "./equipment";
import type { League } from "./player-settings";

const diacritics = /\p{Diacritic}/gu;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(diacritics, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Palette confirmée cdc section 7.1 — une couleur par compétence, distincte
// du code couleur de rareté (--rarity-*), utilisée tant que les vraies
// images de gemmes ne sont pas fournies.
export const equipmentSkillColors: Record<EquipmentSkill, string> = {
  Intrépide: "#c2185b",
  Bravoure: "#4a2c73",
  Recycleur: "#2e7d32",
  Prospérité: "#c9a04a",
  Récupération: "#c9a04a",
  Charognard: "#b5651d",
  Recruteur: "#7b4fa6",
  Vitesse: "#9b59b6",
  Attaque: "#c0392b",
  Défense: "#3a6ea8",
};

// Slug français de chaque ligue tel qu'utilisé dans les noms de fichiers du
// manifeste (cdc section 11) — distinct des clés techniques anglaises.
export const leagueFileSlug: Record<League, string> = {
  bronze: "bronze",
  silver: "argent",
  gold: "or",
  platinum: "platine",
  diamond: "diamant",
  legend: "legende",
};

// Convention actée cdc section 11 : gemme-{competence-slug}-{ligue-slug}.png
export function gemImagePath(skill: EquipmentSkill, league: League): string {
  return `/gems/gemme-${slugify(skill)}-${leagueFileSlug[league]}.png`;
}

// Convention actée cdc section 12 : {famille-slug}-{rarete-slug}-{emplacement-slug}.webp
export function equipmentImagePath(
  family: EquipmentFamily,
  rarity: EquipmentRarity,
  slot: EquipmentSlot,
): string {
  return `/equipment/${slugify(family)}-${slugify(rarity)}-${slugify(slot)}.webp`;
}
