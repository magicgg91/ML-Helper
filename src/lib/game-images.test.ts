import { describe, expect, it } from "vitest";
import {
  equipmentImagePath,
  equipmentSkillColors,
  filterButtonColor,
  gemImagePath,
} from "./game-images";

describe("gemImagePath", () => {
  it("matches the confirmed gem manifest naming convention", () => {
    expect(gemImagePath("Attaque", "legend")).toBe(
      "/gems/gemme-attaque-legende.png",
    );
    expect(gemImagePath("Récupération", "bronze")).toBe(
      "/gems/gemme-recuperation-bronze.png",
    );
    expect(gemImagePath("Vitesse", "silver")).toBe(
      "/gems/gemme-vitesse-argent.png",
    );
  });
});

describe("equipmentImagePath", () => {
  it("matches the confirmed combat equipment manifest naming convention", () => {
    expect(equipmentImagePath("Or", "Légendaire", "Arme")).toBe(
      "/equipment/combat/gold-legendary-weapon.webp",
    );
    expect(equipmentImagePath("Troupes/Vitesse", "Commun", "Amulette")).toBe(
      "/equipment/combat/troops-speed-common-amulet.webp",
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
      "/equipment/expedition/troops-rare-pouch.webp",
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
    expect(filterButtonColor("Or")).toBe("var(--gold)");
    expect(filterButtonColor("gold")).toBe("var(--gold)");
    expect(filterButtonColor("Troupes/Vitesse")).toBe(
      equipmentSkillColors.Vitesse,
    );
    expect(filterButtonColor("speed")).toBe(equipmentSkillColors.Vitesse);
  });

  it("gives the 4 Expedition equipment families their own colors", () => {
    expect(filterButtonColor("Or")).toBe("var(--gold)");
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

  it("returns undefined for a value with no established color (e.g. the custom filter)", () => {
    expect(filterButtonColor("custom")).toBeUndefined();
    expect(filterButtonColor("Personnalisé")).toBeUndefined();
  });
});
