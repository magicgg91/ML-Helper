import { describe, expect, it } from "vitest";
import {
  combatReferenceRows,
  combatValueAtStar,
  defaultExpeditionStarIncrements,
  expeditionMergeCost,
  expeditionReferenceRows,
  expeditionStatKeys,
  expeditionValueAtStar,
  missingCombatRows,
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
