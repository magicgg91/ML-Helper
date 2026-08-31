import type { EquipmentSkill } from "./equipment";
import { rarityClassName } from "./equipment-rarity";
import type { League, SkillKey } from "./player-settings";

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

const equipmentRarityValues = [
  "Commun",
  "Rare",
  "Épique",
  "Mythique",
  "Légendaire",
];

// Bloc 31/H: filter/type buttons (family, rarity, Gems family, Expedition
// equipment type) reuse whichever color already identifies the same
// family/skill elsewhere — rarity/family on the equipment cells, skill
// colors in the Gems visualisations — so a button visually recalls what it
// filters. Returns undefined for a value with no established color, which
// keeps the neutral default style.
export function filterButtonColor(key: string): string | undefined {
  switch (key) {
    // Combat equipment families and their equivalent Gems families.
    case "Attaque":
    case "attack":
      return equipmentSkillColors.Attaque;
    case "Défense":
    case "defense":
      return equipmentSkillColors.Défense;
    // Bloc 42/C: --gold is reserved for genuinely Legendary game data (its
    // own definition comment) — the "Or" family filter gets its own
    // distinct, theme-aware token instead of reusing it.
    case "Or":
    case "gold":
      return "var(--amber)";
    case "Troupes/Vitesse":
    case "speed":
      return equipmentSkillColors.Vitesse;
    // Expedition equipment families.
    case "Équipement":
      return "var(--sapphire)";
    case "Consommables":
      return "var(--emerald)";
    case "Troupes":
      return equipmentSkillColors.Vitesse;
    // Bloc 33/J: "Personnalisé" is a mixed catalog, not tied to any single
    // family — a neutral slate distinguishes it from all 4 semantic family
    // colors above (notably from Troupes' violet-leaning Vitesse color,
    // which otherwise looks close to the default accent it used to fall
    // back to).
    case "custom":
      return "#6b7280";
    default:
      return equipmentRarityValues.includes(key)
        ? `var(--rarity-${rarityClassName(key)})`
        : undefined;
  }
}

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

// League slug as used by the 60 gem files actually delivered (Bloc 36) —
// English, distinct from leagueFileSlug above (equipment images use the
// French convention). Only "legend" differs from the technical League key.
const gemLeagueFileSlug: Record<League, string> = {
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
  platinum: "platinum",
  diamond: "diamond",
  legend: "legendary",
};

// Convention confirmed by the 60 delivered files (Bloc 36):
// gem-{skill-key}-{league}.webp — skill is the SkillKey technical slug
// directly (already a stable English key, cdc "clés techniques" rule), no
// further slugification needed.
export function gemImagePath(skill: SkillKey, league: League): string {
  return `/gems/gem-${skill}-${gemLeagueFileSlug[league]}.webp`;
}

// Convention actée cdc section 12 : {family}-{rarity}-{slot}.webp.
// The catalogs retain their French domain labels, while static asset names use
// stable English slugs. The slot unambiguously identifies the catalog.
const rarityFileSlugs: Record<string, string> = {
  Commun: "common",
  Rare: "rare",
  Épique: "epic",
  Mythique: "mythic",
  Légendaire: "legendary",
};

const combatFamilyFileSlugs: Record<string, string> = {
  Attaque: "attack",
  Défense: "defense",
  Or: "gold",
  "Troupes/Vitesse": "troops-speed",
};

const combatSlotFileSlugs: Record<string, string> = {
  Arme: "weapon",
  Bouclier: "shield",
  Ceinture: "belt",
  Anneau: "ring",
  Bracelet: "bracelet",
  Amulette: "amulet",
  Casque: "helmet",
  Gantelet: "gauntlet",
  Bottes: "boots",
};

const expeditionFamilyFileSlugs: Record<string, string> = {
  Or: "gold",
  Équipement: "equipment",
  Consommables: "consumables",
  Troupes: "troops",
};

const expeditionSlotFileSlugs: Record<string, string> = {
  Cape: "cape",
  "Longue-vue": "spyglass",
  Sacoche: "pouch",
  Boussole: "compass",
  Torche: "torch",
  Pioche: "pickaxe",
};

export function equipmentImagePath(
  family: string,
  rarity: string,
  slot: string,
): string {
  const isCombat = slot in combatSlotFileSlugs;
  const directory = isCombat ? "combat" : "expedition";
  const familySlugs = isCombat
    ? combatFamilyFileSlugs
    : expeditionFamilyFileSlugs;
  const slotSlugs = isCombat ? combatSlotFileSlugs : expeditionSlotFileSlugs;

  return `/equipment/${directory}/${familySlugs[family] ?? slugify(family)}-${rarityFileSlugs[rarity] ?? slugify(rarity)}-${slotSlugs[slot] ?? slugify(slot)}.webp`;
}
