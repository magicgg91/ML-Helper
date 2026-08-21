import { combatEquipmentData } from "./equipment-data";
import { gemValue } from "./gems-templars";
import type { LeagueSelection, SkillKey } from "./player-settings";

export const equipmentBlocks = ["attack", "defense", "gold", "speed"] as const;
export type EquipmentBlock = (typeof equipmentBlocks)[number];
export type EquipmentFamily = "Attaque" | "Défense" | "Or" | "Troupes/Vitesse";
export type EquipmentRarity =
  "Commun" | "Rare" | "Épique" | "Mythique" | "Légendaire";
export type EquipmentSlot = (typeof equipmentSlotLayout)[number];

export const equipmentSlotLayout = [
  "Amulette",
  "Casque",
  "Bracelet",
  "Anneau",
  "Ceinture",
  "Gantelet",
  "Arme",
  "Bottes",
  "Bouclier",
] as const;

export const equipmentBlockDefinitions: Record<
  EquipmentBlock,
  {
    label: string;
    families: readonly EquipmentFamily[];
  }
> = {
  attack: { label: "Attaque", families: ["Attaque"] },
  defense: { label: "Défense", families: ["Défense", "Or"] },
  gold: { label: "Or", families: ["Or", "Troupes/Vitesse"] },
  speed: { label: "Vitesse", families: ["Troupes/Vitesse"] },
};

export const rarityOrder: readonly EquipmentRarity[] = [
  "Légendaire",
  "Mythique",
  "Épique",
  "Rare",
  "Commun",
];
export const gemSlotsByRarity: Record<EquipmentRarity, number> = {
  Commun: 0,
  Rare: 0,
  Épique: 1,
  Mythique: 2,
  Légendaire: 3,
};

export const equipmentSkillLabels = [
  "Attaque",
  "Charognard",
  "Intrépide",
  "Bravoure",
  "Défense",
  "Recycleur",
  "Récupération",
  "Prospérité",
  "Recruteur",
  "Vitesse",
] as const;
export type EquipmentSkill = (typeof equipmentSkillLabels)[number];

export const equipmentStarIncrement: Record<EquipmentSkill, number> = {
  Attaque: 2,
  Charognard: 2,
  Intrépide: 2,
  Bravoure: 2,
  Défense: 3,
  Recycleur: 1,
  Récupération: 1,
  Prospérité: 3,
  Recruteur: 3,
  Vitesse: 5,
};

const allowlist: Record<
  EquipmentBlock,
  Partial<Record<EquipmentFamily, readonly EquipmentSkill[]>>
> = {
  attack: { Attaque: ["Attaque", "Charognard", "Intrépide"] },
  defense: {
    Défense: ["Bravoure", "Défense", "Recycleur"],
    Or: ["Recycleur", "Récupération"],
  },
  gold: { Or: ["Prospérité"], "Troupes/Vitesse": ["Recruteur"] },
  speed: { "Troupes/Vitesse": ["Vitesse"] },
};

const skillKeyByLabel: Record<EquipmentSkill, SkillKey> = {
  Attaque: "striker",
  Charognard: "scavenger",
  Intrépide: "fearless",
  Bravoure: "brave",
  Défense: "guardian",
  Recycleur: "salvager",
  Récupération: "cautious",
  Prospérité: "prosperous",
  Recruteur: "recruiter",
  Vitesse: "rusher",
};

export type EquipmentGem = {
  skill: EquipmentSkill | "none";
  star: number;
  league: LeagueSelection;
};
export type EquipmentSelection = { rarity: EquipmentRarity; setName: string };
export type EquipmentSlotState = {
  equipment: EquipmentSelection | null;
  star: number;
  gems: EquipmentGem[];
};
export type StuffState = Record<EquipmentBlock, EquipmentSlotState[]>;

export function createEmptyStuffState(): StuffState {
  return Object.fromEntries(
    equipmentBlocks.map((block) => [
      block,
      equipmentSlotLayout.map(() => ({ equipment: null, star: 1, gems: [] })),
    ]),
  ) as unknown as StuffState;
}

export function allowedSkills(block: EquipmentBlock): EquipmentSkill[] {
  return [...new Set(Object.values(allowlist[block]).flat())].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

export function isEquipmentSkillAllowed(
  block: EquipmentBlock,
  family: EquipmentFamily,
  skill: string,
): skill is EquipmentSkill {
  return (allowlist[block][family] ?? []).includes(skill as EquipmentSkill);
}

export function equipmentValueAtStar(
  skill: EquipmentSkill,
  base: number,
  star: number,
): number {
  return (
    base + equipmentStarIncrement[skill] * (Math.max(1, Math.min(8, star)) - 1)
  );
}

export function equipmentOptions(block: EquipmentBlock, slot: EquipmentSlot) {
  const families = equipmentBlockDefinitions[block].families;
  return combatEquipmentData
    .filter(
      (item) =>
        item.slot_type === slot &&
        families.includes(item.family as EquipmentFamily),
    )
    .sort(
      (a, b) =>
        rarityOrder.indexOf(a.rarity as EquipmentRarity) -
        rarityOrder.indexOf(b.rarity as EquipmentRarity),
    );
}

export function equipmentLabel(
  item: (typeof combatEquipmentData)[number],
): string {
  return `${item.rarity} — ${item.set_name} (${item.family})`;
}

export function findEquipment(
  slot: EquipmentSlot,
  selection: EquipmentSelection | null,
) {
  if (!selection) return undefined;
  return combatEquipmentData.find(
    (item) =>
      item.slot_type === slot &&
      item.rarity === selection.rarity &&
      item.set_name === selection.setName,
  );
}

function add(
  total: Partial<Record<EquipmentSkill, number>>,
  skill: EquipmentSkill,
  value: number,
) {
  total[skill] = (total[skill] ?? 0) + value;
}

export function computeEquipmentSlot(
  block: EquipmentBlock,
  slot: EquipmentSlot,
  state: EquipmentSlotState,
) {
  const total: Partial<Record<EquipmentSkill, number>> = {};
  const item = findEquipment(slot, state.equipment);
  if (item) {
    for (const index of [1, 2, 3, 4] as const) {
      const skill = item[`skill_${index}`];
      const value = Number(item[`value_${index}_pct`]);
      if (
        Number.isFinite(value) &&
        isEquipmentSkillAllowed(block, item.family as EquipmentFamily, skill)
      ) {
        add(total, skill, equipmentValueAtStar(skill, value, state.star));
      }
    }
  }
  for (const gem of state.gems) {
    if (
      gem.skill !== "none" &&
      gem.league &&
      allowedSkills(block).includes(gem.skill)
    ) {
      add(
        total,
        gem.skill,
        gem.star * gemValue(skillKeyByLabel[gem.skill], gem.league),
      );
    }
  }
  return total;
}

export function computeStuffBlock(
  block: EquipmentBlock,
  slots: EquipmentSlotState[],
) {
  const total: Partial<Record<EquipmentSkill, number>> = {};
  equipmentSlotLayout.forEach((slot, index) => {
    Object.entries(computeEquipmentSlot(block, slot, slots[index])).forEach(
      ([skill, value]) => add(total, skill as EquipmentSkill, value),
    );
  });
  return total;
}

export function computeStuffGlobal(state: StuffState) {
  const total: Partial<Record<EquipmentSkill, number>> = {};
  equipmentBlocks.forEach((block) => {
    Object.entries(computeStuffBlock(block, state[block])).forEach(
      ([skill, value]) => add(total, skill as EquipmentSkill, value),
    );
  });
  return total;
}
