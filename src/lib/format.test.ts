import { describe, expect, it } from "vitest";
import {
  formatExactNumber,
  formatGameNumber,
  formatPercent,
  formatSkillPercentValue,
} from "./format";

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

describe("formatPercent", () => {
  it("appends the sign to a rounded skill percentage", () => {
    expect(formatPercent(23.75, "en")).toBe("23.8%");
    expect(formatPercent(0, "en")).toBe("0%");
  });

  it("shows an em dash rather than inventing a value", () => {
    expect(formatPercent(null, "en")).toBe("—");
  });
});

describe("formatGameNumber", () => {
  it("compacts large quantities and keeps small ones intact", () => {
    expect(formatGameNumber(1500)).toBe("1.5k");
    expect(formatGameNumber(2_400_000)).toBe("2.4M");
    expect(formatGameNumber(999)).toBe("999");
  });

  it("keeps the sign on negatives", () => {
    expect(formatGameNumber(-1500)).toBe("-1.5k");
  });

  // Bloc 63/B: the Progression reference now runs to level 200, where Légende
  // fields ~3.5e20 troops and reaching the level costs ~1.8e24 XP. The unit
  // table stopped at P (1e15), so those printed as "348148.01P" and
  // "1818669406.06P" — still technically correct, and no longer compact.
  it("keeps compacting past peta, where the level-200 rows live", () => {
    expect(formatGameNumber(3.5e20)).toBe("350E");
    expect(formatGameNumber(1.8e24)).toBe("1.8Y");
    expect(formatGameNumber(2.5e21)).toBe("2.5Z");
  });

  it("never prints more than 3 digits before a suffix, at any magnitude", () => {
    // What the missing units really cost: the format's own promise. Walked
    // across every decade the reference can reach, from a single troop at
    // level 1 to the XP of the last level.
    for (let exponent = 0; exponent <= 26; exponent += 1)
      expect(formatGameNumber(1.5 * 10 ** exponent), `1.5e${exponent}`).toMatch(
        /^\d{1,3}(\.\d{1,2})?[kMGTPEZY]?$/,
      );
  });
});

// Bloc 93/F4: the third formatting style the site used, previously written
// as a bare Math.round at each call site — which printed "12345" where the
// ranking table's hand-written toLocaleString printed "12 345".
describe("formatExactNumber", () => {
  it("keeps the exact figure and adds the locale's thousands separator", () => {
    // French uses U+202F (narrow no-break space) as the group separator.
    expect(formatExactNumber(21929, "fr")).toBe("21\u202f929");
    expect(formatExactNumber(21929, "en")).toBe("21,929");
    expect(formatExactNumber(3000, "fr")).toBe("3\u202f000");
  });

  it("never compacts, unlike formatGameNumber", () => {
    expect(formatExactNumber(2_400_000, "en")).toBe("2,400,000");
    expect(formatExactNumber(2_400_000, "en")).not.toMatch(/[kKmMgG]/);
  });

  it("rounds to a whole number", () => {
    expect(formatExactNumber(1234.6, "en")).toBe("1,235");
    expect(formatExactNumber(1234.4, "en")).toBe("1,234");
  });

  it("leaves values below a thousand unseparated", () => {
    expect(formatExactNumber(999, "fr")).toBe("999");
    expect(formatExactNumber(0, "fr")).toBe("0");
  });
});
