import { describe, expect, it } from "vitest";
import { defaultGemParameters, parseGemParameters } from "./gem-parameters";

describe("gem parameters", () => {
  it("falls back to the confirmed defaults for malformed input", () => {
    expect(parseGemParameters(null)).toEqual(defaultGemParameters);
    expect(parseGemParameters("not an object")).toEqual(defaultGemParameters);
  });

  it("keeps unaffected keys at their default when only some are overridden", () => {
    const parsed = parseGemParameters({
      skillFactor: { rusher: 3 },
      leagueFactor: { legend: 10 },
      gemPrice: { legend: 9000 },
    });
    expect(parsed.skillFactor.rusher).toBe(3);
    expect(parsed.skillFactor.striker).toBe(
      defaultGemParameters.skillFactor.striker,
    );
    expect(parsed.leagueFactor.legend).toBe(10);
    expect(parsed.leagueFactor.bronze).toBe(
      defaultGemParameters.leagueFactor.bronze,
    );
    expect(parsed.gemPrice.legend).toBe(9000);
    expect(parsed.gemPrice.silver).toBe(defaultGemParameters.gemPrice.silver);
  });

  it("ignores non-numeric overrides and keeps the default", () => {
    const parsed = parseGemParameters({
      skillFactor: { rusher: "not a number" },
    });
    expect(parsed.skillFactor.rusher).toBe(
      defaultGemParameters.skillFactor.rusher,
    );
  });
});
