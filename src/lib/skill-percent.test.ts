import { describe, expect, it } from "vitest";
import { formatSkillPercentValue } from "./skill-percent";

describe("Bloc 87/A: formatSkillPercentValue", () => {
  it("rounds to 1 decimal with standard rounding — 23.75 -> 23.8, never 23.7", () => {
    expect(formatSkillPercentValue(23.75, "en")).toBe("23.8");
    expect(formatSkillPercentValue(23.75, "fr")).toBe("23,8");
  });

  it("rounds down when the second decimal is below 5", () => {
    expect(formatSkillPercentValue(23.74, "en")).toBe("23.7");
    expect(formatSkillPercentValue(23.849, "en")).toBe("23.8");
  });

  it("rounds up a trailing 5 on other magnitudes too", () => {
    expect(formatSkillPercentValue(0.15, "en")).toBe("0.2");
    expect(formatSkillPercentValue(23.85, "en")).toBe("23.9");
  });

  it("shows no decimal for a whole value (never a padded 23.0)", () => {
    expect(formatSkillPercentValue(23, "en")).toBe("23");
    expect(formatSkillPercentValue(12.0499999, "en")).toBe("12");
  });
});
