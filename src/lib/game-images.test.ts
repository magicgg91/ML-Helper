import { describe, expect, it } from "vitest";
import { equipmentImagePath, equipmentSkillColors, gemImagePath } from "./game-images";

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
      "/equipment/or-legendaire-arme.webp",
    );
    expect(
      equipmentImagePath("Troupes/Vitesse", "Commun", "Amulette"),
    ).toBe("/equipment/troupes-vitesse-commun-amulette.webp");
    expect(equipmentImagePath("Attaque", "Épique", "Bottes")).toBe(
      "/equipment/attaque-epique-bottes.webp",
    );
  });

  it("also matches the expedition equipment manifest (different vocabulary, same convention)", () => {
    expect(equipmentImagePath("Équipement", "Épique", "Longue-vue")).toBe(
      "/equipment/equipement-epique-longue-vue.webp",
    );
    expect(equipmentImagePath("Troupes", "Rare", "Sacoche")).toBe(
      "/equipment/troupes-rare-sacoche.webp",
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
