import { describe, expect, it } from "vitest";
import { defaultGemParameters, parseGemParameters } from "./gem-parameters";

describe("gem parameters", () => {
  it("falls back to the confirmed defaults for malformed input", () => {
    expect(parseGemParameters(null)).toEqual(defaultGemParameters);
    expect(parseGemParameters("not an object")).toEqual(defaultGemParameters);
  });

  it("keeps unaffected cells at their default when only some are overridden", () => {
    const parsed = parseGemParameters({
      skillLeagueValue: { rusher: { legend: 20 } },
      gemPrice: { legend: 9000 },
    });
    expect(parsed.skillLeagueValue.rusher.legend).toBe(20);
    expect(parsed.skillLeagueValue.rusher.bronze).toBe(
      defaultGemParameters.skillLeagueValue.rusher.bronze,
    );
    expect(parsed.skillLeagueValue.striker.legend).toBe(
      defaultGemParameters.skillLeagueValue.striker.legend,
    );
    expect(parsed.gemPrice.legend).toBe(9000);
    expect(parsed.gemPrice.silver).toBe(defaultGemParameters.gemPrice.silver);
  });

  it("ignores non-numeric overrides and keeps the default", () => {
    const parsed = parseGemParameters({
      skillLeagueValue: { rusher: { legend: "not a number" } },
    });
    expect(parsed.skillLeagueValue.rusher.legend).toBe(
      defaultGemParameters.skillLeagueValue.rusher.legend,
    );
  });

  it("rejects non-positive values and prices to avoid division by zero", () => {
    const parsed = parseGemParameters({
      skillLeagueValue: { rusher: { legend: 0 } },
      gemPrice: { legend: -100 },
    });
    expect(parsed.skillLeagueValue.rusher.legend).toBe(
      defaultGemParameters.skillLeagueValue.rusher.legend,
    );
    expect(parsed.gemPrice.legend).toBe(defaultGemParameters.gemPrice.legend);
  });
});
