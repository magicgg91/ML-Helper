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

  // Bloc 126/B: Bronze is the one price allowed to be missing, so it is the
  // one that has no default to fall back on. Everything else about the five
  // priced leagues is unchanged — the tests above still hold.
  describe("the Bronze price", () => {
    it("is absent by default, because the game sells no Bronze gems", () => {
      expect(defaultGemParameters.gemPrice.bronze).toBeNull();
      expect(parseGemParameters(null).gemPrice.bronze).toBeNull();
    });

    it("comes back as typed once somebody has typed one", () => {
      const parsed = parseGemParameters({ gemPrice: { bronze: 2000 } });
      expect(parsed.gemPrice.bronze).toBe(2000);
      // And the five that always had a price are untouched by it.
      expect(parsed.gemPrice.silver).toBe(defaultGemParameters.gemPrice.silver);
    });

    it("reads back as absent for anything that is not a usable price", () => {
      for (const bronze of [undefined, null, "", 0, -100, "not a number"]) {
        expect(parseGemParameters({ gemPrice: { bronze } }).gemPrice.bronze)
          // An unusable price is no price: the admin field shows blank and
          // the public reference prints its dash, rather than the site
          // quoting Bronze gems at zero sapphires.
          .toBeNull();
      }
    });
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
