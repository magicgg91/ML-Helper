import { describe, expect, it } from "vitest";
import {
  equipmentImagePath,
  equipmentSkillColors,
  filterButtonColor,
  gemImagePath,
} from "./game-images";

describe("gemImagePath", () => {
  it("matches the naming convention of the 60 gem files actually delivered (Bloc 36)", () => {
    expect(gemImagePath("striker", "legend")).toBe(
      "/gems/gem-striker-legendary.webp",
    );
    expect(gemImagePath("cautious", "bronze")).toBe(
      "/gems/gem-cautious-bronze.webp",
    );
    expect(gemImagePath("rusher", "silver")).toBe(
      "/gems/gem-rusher-silver.webp",
    );
  });
});

describe("equipmentImagePath", () => {
  it("matches the confirmed combat equipment manifest naming convention", () => {
    expect(equipmentImagePath("Or", "Légendaire", "Arme")).toBe(
      "/equipment/combat/gold-legendary-weapon.webp",
    );
    expect(equipmentImagePath("Troupes/Vitesse", "Commun", "Amulette")).toBe(
      "/equipment/combat/troop-common-amulet.webp",
    );
    expect(equipmentImagePath("Attaque", "Épique", "Bottes")).toBe(
      "/equipment/combat/attack-epic-boots.webp",
    );
  });

  it("also matches the expedition equipment manifest (different vocabulary, same convention)", () => {
    expect(equipmentImagePath("Équipement", "Épique", "Longue-vue")).toBe(
      "/equipment/expedition/equipment-epic-spyglass.webp",
    );
    expect(equipmentImagePath("Troupes", "Rare", "Sacoche")).toBe(
      "/equipment/expedition/troop-rare-pouch.webp",
    );
    expect(equipmentImagePath("Consommables", "Commun", "Cape")).toBe(
      "/equipment/expedition/consumable-common-cape.webp",
    );
  });

  // Bloc 82/E: the 300-file manifest actually delivered by the player
  // settled on "mythical" (not "mythic") and "gauntlets" (not "gauntlet")
  // — this file's slug maps were updated to match exactly.
  it("Bloc82/E: uses 'mythical' for Mythique and 'gauntlets' for Gantelet, matching the delivered files", () => {
    expect(equipmentImagePath("Attaque", "Mythique", "Gantelet")).toBe(
      "/equipment/combat/attack-mythical-gauntlets.webp",
    );
  });
});

describe("equipmentSkillColors", () => {
  it("gives every combat skill its own confirmed hex color", () => {
    expect(equipmentSkillColors.Attaque).toBe("#c0392b");
    expect(equipmentSkillColors.Défense).toBe("#3a6ea8");
    expect(equipmentSkillColors.Prospérité).toBe(
      equipmentSkillColors.Récupération,
    );
  });
});

describe("filterButtonColor (Bloc 31/H)", () => {
  it("reuses the same color already used for the equivalent Combat/Gems family or skill", () => {
    expect(filterButtonColor("Attaque")).toBe(equipmentSkillColors.Attaque);
    expect(filterButtonColor("attack")).toBe(equipmentSkillColors.Attaque);
    expect(filterButtonColor("Défense")).toBe(equipmentSkillColors.Défense);
    expect(filterButtonColor("defense")).toBe(equipmentSkillColors.Défense);
    expect(filterButtonColor("Or")).toBe("var(--amber)");
    expect(filterButtonColor("gold")).toBe("var(--amber)");
    expect(filterButtonColor("Troupes/Vitesse")).toBe(
      equipmentSkillColors.Vitesse,
    );
    expect(filterButtonColor("speed")).toBe(equipmentSkillColors.Vitesse);
  });

  it("gives the 4 Expedition equipment families their own colors", () => {
    expect(filterButtonColor("Or")).toBe("var(--amber)");
    expect(filterButtonColor("Équipement")).toBe("var(--sapphire)");
    expect(filterButtonColor("Consommables")).toBe("var(--emerald)");
    expect(filterButtonColor("Troupes")).toBe(equipmentSkillColors.Vitesse);
  });

  it("reuses the --rarity-* palette for every equipment rarity", () => {
    for (const [rarity, className] of [
      ["Commun", "commun"],
      ["Rare", "rare"],
      ["Épique", "epique"],
      ["Mythique", "mythique"],
      ["Légendaire", "legendaire"],
    ] as const)
      expect(filterButtonColor(rarity)).toBe(`var(--rarity-${className})`);
  });

  it("returns undefined for a value with no established color", () => {
    expect(filterButtonColor("Personnalisé")).toBeUndefined();
    expect(filterButtonColor("unknown-key")).toBeUndefined();
  });

  it("gives the 'custom' filter its own color, distinct from the 4 family colors (Bloc 33/J)", () => {
    const customColor = filterButtonColor("custom");
    expect(customColor).toBeDefined();
    const familyColors = [
      filterButtonColor("Or"),
      filterButtonColor("Équipement"),
      filterButtonColor("Consommables"),
      filterButtonColor("Troupes"),
    ];
    for (const color of familyColors) expect(customColor).not.toBe(color);
  });
});
