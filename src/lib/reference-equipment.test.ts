import { describe, expect, it } from "vitest";
import {
  combatReferenceRows,
  combatValueAtStar,
  expeditionValueAtStar,
  missingCombatRows,
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
  it("marks only the two confirmed expedition progressions", () => {
    expect(expeditionValueAtStar("Équipement", "0.6", 2)).toEqual({
      value: 0.8,
      confirmed: true,
    });
    expect(expeditionValueAtStar("Vitalité", "15", 2)).toEqual({
      value: 17.5,
      confirmed: true,
    });
    expect(expeditionValueAtStar("Or", "2", 3)).toEqual({
      value: 6,
      confirmed: false,
    });
  });
});
