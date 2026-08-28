import { describe, expect, it } from "vitest";
import {
  combatReferenceRows,
  combatValueAtStar,
  defaultCombatGemSlotsBase,
  defaultCombatSkydustBase,
  defaultExpeditionDismantleBase,
  defaultExpeditionMergeCostBase,
  defaultExpeditionStarIncrements,
  expeditionMergeCost,
  expeditionReferenceRows,
  expeditionStatKeys,
  expeditionValueAtStar,
  mergeCostRarityKeys,
  missingCombatRows,
  parseCombatGemSlotsBase,
  parseCombatSkydustBase,
  parseExpeditionDismantleBase,
  parseExpeditionMergeCostBase,
  parseExpeditionStarIncrements,
} from "./reference-equipment";

describe("reference equipment", () => {
  it("keeps exactly 30 explicitly unknown combat rows", () => {
    expect(combatReferenceRows).toHaveLength(180);
    expect(missingCombatRows()).toHaveLength(30);
  });
  it("uses confirmed additive combat progression", () => {
    expect(combatValueAtStar("Défense", "15", 5)).toBe(27);
    expect(combatValueAtStar("Inconnu", "", 5)).toBeNull();
  });

  it("confirms all 10 expedition stats via the default increments", () => {
    expect(expeditionValueAtStar("Équipement", "0.6", 2)).toEqual({
      value: 0.8,
      confirmed: true,
    });
    expect(expeditionValueAtStar("Vitalité", "15", 2)).toEqual({
      value: 17.5,
      confirmed: true,
    });
    // Cross-validated at Commun/Or/Torche (0.9% at 1★, +0.3%/★) as well as
    // at Légendaire — same increment either way.
    expect(expeditionValueAtStar("Or", "0.9", 2)).toEqual({
      value: 1.2,
      confirmed: true,
    });
    for (const key of expeditionStatKeys)
      expect(defaultExpeditionStarIncrements[key]).toBeGreaterThan(0);
  });

  it("treats a genuinely unknown stat name as unconfirmed", () => {
    expect(expeditionValueAtStar("Inconnue", "1", 2)).toEqual({
      value: null,
      confirmed: false,
    });
  });

  it("returns no value for an empty base (no secondary stat below Épique)", () => {
    expect(expeditionValueAtStar("Vitalité", "", 3)).toEqual({
      value: null,
      confirmed: false,
    });
  });

  it("lets an admin override the expedition increments, falling back per-key", () => {
    const overridden = parseExpeditionStarIncrements({ Or: 0.5 });
    expect(overridden.Or).toBe(0.5);
    expect(overridden.Chance).toBe(defaultExpeditionStarIncrements.Chance);
    expect(expeditionValueAtStar("Or", "1", 3, overridden)).toEqual({
      value: 2,
      confirmed: true,
    });
  });

  it("falls back to the defaults for garbage input", () => {
    expect(parseExpeditionStarIncrements(null)).toEqual(
      defaultExpeditionStarIncrements,
    );
    expect(parseExpeditionStarIncrements({ Or: "not-a-number" })).toEqual(
      defaultExpeditionStarIncrements,
    );
  });

  it("loads the 5 confirmed Terradust merge-cost constants as independent values, not a uniform doubling", () => {
    expect(expeditionMergeCost("Commun", 1)).toBe(600);
    expect(expeditionMergeCost("Rare", 1)).toBe(1100);
    expect(expeditionMergeCost("Épique", 1)).toBe(2000);
    expect(expeditionMergeCost("Mythique", 1)).toBe(4000);
    expect(expeditionMergeCost("Légendaire", 1)).toBe(8000);
    // Doubles per star upgrade within the same rarity.
    expect(expeditionMergeCost("Commun", 2)).toBe(1200);
    expect(expeditionMergeCost("Commun", 3)).toBe(2400);
    expect(expeditionMergeCost("Inconnue", 1)).toBeNull();
  });

  it("lets an admin override the Terradust merge-cost base, falling back per-rarity", () => {
    const overridden = parseExpeditionMergeCostBase({ Commun: 700 });
    expect(overridden.Commun).toBe(700);
    expect(overridden.Légendaire).toBe(
      defaultExpeditionMergeCostBase.Légendaire,
    );
    expect(expeditionMergeCost("Commun", 1, overridden)).toBe(700);
    expect(parseExpeditionMergeCostBase(null)).toEqual(
      defaultExpeditionMergeCostBase,
    );
    expect(parseExpeditionMergeCostBase({ Commun: "not-a-number" })).toEqual(
      defaultExpeditionMergeCostBase,
    );
    for (const key of mergeCostRarityKeys)
      expect(defaultExpeditionMergeCostBase[key]).toBeGreaterThan(0);
  });

  it("Bloc35 6.1: defaults Combat's per-rarity Pouciel/gem-slots to the cdc-confirmed values, admin-editable per rarity", () => {
    expect(defaultCombatSkydustBase).toEqual({
      Commun: 3,
      Rare: 10,
      Épique: 30,
      Mythique: 120,
      Légendaire: 160,
    });
    expect(defaultCombatGemSlotsBase).toEqual({
      Commun: 0,
      Rare: 0,
      Épique: 1,
      Mythique: 2,
      Légendaire: 3,
    });
    const skydustOverride = parseCombatSkydustBase({ Commun: 5 });
    expect(skydustOverride.Commun).toBe(5);
    expect(skydustOverride.Légendaire).toBe(
      defaultCombatSkydustBase.Légendaire,
    );
    expect(parseCombatSkydustBase(null)).toEqual(defaultCombatSkydustBase);
    expect(parseCombatSkydustBase({ Commun: "not-a-number" })).toEqual(
      defaultCombatSkydustBase,
    );
    const gemSlotsOverride = parseCombatGemSlotsBase({ Épique: 2 });
    expect(gemSlotsOverride.Épique).toBe(2);
    expect(gemSlotsOverride.Commun).toBe(defaultCombatGemSlotsBase.Commun);
    expect(parseCombatGemSlotsBase(null)).toEqual(defaultCombatGemSlotsBase);
  });

  it("Bloc35 5.2: defaults Expedition's per-rarity dismantle Terradust to 0 (unconfirmed in cdc), admin-editable per rarity", () => {
    for (const key of mergeCostRarityKeys)
      expect(defaultExpeditionDismantleBase[key]).toBe(0);
    const overridden = parseExpeditionDismantleBase({ Rare: 42 });
    expect(overridden.Rare).toBe(42);
    expect(overridden.Commun).toBe(0);
    expect(parseExpeditionDismantleBase(null)).toEqual(
      defaultExpeditionDismantleBase,
    );
    expect(parseExpeditionDismantleBase({ Rare: "not-a-number" })).toEqual(
      defaultExpeditionDismantleBase,
    );
  });

  it("PR #57 review: rounds absolute per-rarity quantities to an integer (AGENTS.md — no decimals outside percentages)", () => {
    expect(parseCombatSkydustBase({ Commun: 42.6 }).Commun).toBe(43);
    expect(parseCombatGemSlotsBase({ Épique: 1.5 }).Épique).toBe(2);
    expect(parseExpeditionDismantleBase({ Rare: 7.4 }).Rare).toBe(7);
    expect(parseExpeditionMergeCostBase({ Commun: 700.2 }).Commun).toBe(700);
  });

  it("keeps the same primary-stat value across all 6 slots of a set, per rarity and family", () => {
    const bySet = new Map<string, Set<string>>();
    for (const row of expeditionReferenceRows) {
      const key = `${row.rarity}|${row.set_name}|${row.family}`;
      const values = bySet.get(key) ?? new Set<string>();
      values.add(row.type_stat_pct);
      bySet.set(key, values);
    }
    expect(bySet.size).toBe(20); // 5 rarities x 4 families
    for (const values of bySet.values()) expect(values.size).toBe(1);
    expect(expeditionReferenceRows).toHaveLength(120);
  });
});
