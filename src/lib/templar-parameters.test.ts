import { describe, expect, it } from "vitest";
import {
  defaultTemplarParameters,
  parseTemplarParameters,
} from "./templar-parameters";

describe("parseTemplarParameters", () => {
  it("returns the confirmed defaults for a non-object value", () => {
    expect(parseTemplarParameters(null)).toEqual(defaultTemplarParameters);
    expect(parseTemplarParameters(undefined)).toEqual(
      defaultTemplarParameters,
    );
    expect(parseTemplarParameters("not-an-object")).toEqual(
      defaultTemplarParameters,
    );
  });

  it("accepts an administrator-provided override", () => {
    expect(parseTemplarParameters({ base: 200, ratio: 1.4 })).toEqual({
      base: 200,
      ratio: 1.4,
    });
  });

  it("falls back per field for non-finite or non-positive values", () => {
    expect(parseTemplarParameters({ base: 0, ratio: 1.4 })).toEqual({
      base: defaultTemplarParameters.base,
      ratio: 1.4,
    });
    expect(parseTemplarParameters({ base: -5, ratio: "oops" })).toEqual(
      defaultTemplarParameters,
    );
  });
});
