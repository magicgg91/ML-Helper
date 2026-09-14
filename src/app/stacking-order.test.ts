import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(path.join(__dirname, "globals.css"), "utf8");

function extractRule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Rule for ${selector} not found`);
  const end = css.indexOf("}", start);
  return css.slice(start, end + 1);
}

function extractZIndex(rule: string): number {
  const match = /z-index:\s*(-?\d+)/.exec(rule);
  if (!match) throw new Error(`No z-index declared in: ${rule}`);
  return Number(match[1]);
}

describe("public header stacking order", () => {
  it("keeps the header above every other stacked element on the page", () => {
    // The mobile menu dropdown lives inside .public-header (absolutely
    // positioned, no z-index of its own) and relies entirely on the header
    // establishing a stacking context above the rest of the page. Regression
    // test for the header appearing behind the homepage's first tile
    // (.home-carousel-copy, z-index: 1): .public-header had position:relative
    // but no z-index, so it never actually contained that tile's stacking
    // context — any later element with an explicit z-index escaped above it.
    const headerRule = extractRule(globalsCss, ".public-header");
    const headerZIndex = extractZIndex(headerRule);

    const cssWithoutHeaderRule = globalsCss.replace(headerRule, "");
    const otherZIndexes = [
      ...cssWithoutHeaderRule.matchAll(/z-index:\s*(-?\d+)/g),
    ].map((match) => Number(match[1]));

    expect(otherZIndexes.length).toBeGreaterThan(0);
    for (const value of otherZIndexes) {
      expect(headerZIndex).toBeGreaterThan(value);
    }
  });
});
