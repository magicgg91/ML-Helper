import { describe, expect, it } from "vitest";
import { valueAtStar } from "./star-progression";

describe("valueAtStar", () => {
  it("adds increment * (star - 1) to the base, matching the combat formula", () => {
    // Défense +3%/★ from 15% base at 1★ -> 27% at 5★ (pre-existing combat
    // non-regression case, now driven by the shared helper).
    expect(valueAtStar(15, 3, 5)).toBe(27);
  });

  it("matches the confirmed expedition example (Équipement +0.2%/★)", () => {
    expect(valueAtStar(0.6, 0.2, 2)).toBeCloseTo(0.8);
  });

  it("clamps below 1★ and above the 8★ ceiling", () => {
    expect(valueAtStar(10, 2, 0)).toBe(10);
    expect(valueAtStar(10, 2, 1)).toBe(10);
    expect(valueAtStar(10, 2, 8)).toBe(24);
    expect(valueAtStar(10, 2, 20)).toBe(24);
  });
});
