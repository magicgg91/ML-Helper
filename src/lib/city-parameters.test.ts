import { describe, expect, it } from "vitest";
import { defaultCityParameters, parseCityParameters } from "./city-parameters";

describe("parseCityParameters", () => {
  it("returns the confirmed defaults for a non-object value", () => {
    expect(parseCityParameters(null)).toEqual(defaultCityParameters);
    expect(parseCityParameters(undefined)).toEqual(defaultCityParameters);
    expect(parseCityParameters("not-an-object")).toEqual(defaultCityParameters);
  });

  it("accepts an administrator-provided full override", () => {
    const source = {
      vp: { base: 21, ratio: 1.2 },
      walls: { base: 71, ratio: 1.21 },
      cost: { base: 11, ratio: 1.21 },
      multipliers: {
        bronze: { army: 2.1, gold: 5.1 },
        silver: { army: 2.35, gold: 6.35 },
        gold: { army: 2.85, gold: 8.85 },
        platinum: { army: 2.85, gold: 8.85 },
        diamond: { army: 3.1, gold: 10.1 },
        legend: { army: 3.1, gold: 10.1 },
      },
    };
    expect(parseCityParameters(source)).toEqual(source);
  });

  it("falls back per field when values are missing or non-finite", () => {
    const result = parseCityParameters({
      vp: { base: "not-a-number", ratio: 1.2 },
      multipliers: { bronze: { army: 2.5 } },
    });
    expect(result.vp).toEqual({ base: 20, ratio: 1.2 });
    expect(result.walls).toEqual(defaultCityParameters.walls);
    expect(result.multipliers.bronze).toEqual({ army: 2.5, gold: 5 });
    expect(result.multipliers.silver).toEqual(
      defaultCityParameters.multipliers.silver,
    );
  });
});
