import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

const rgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const luminance = (hex: string) => {
  const channels = rgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
};
const contrast = (foreground: string, background: string) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter! + 0.05) / (darker! + 0.05);
};
const variable = (block: string, name: string) =>
  block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];

describe("public responsive styles", () => {
  it("always splits the skill summary 5/5 across two rows, on every viewport width", () => {
    // Unconditional — not gated behind any @media breakpoint, so desktop
    // gets the same 2-row split as mobile/tablet instead of one long
    // horizontally-scrolling line.
    expect(css).toMatch(
      /\.player-summary-skill-group\s*{\s*display: block;\s*white-space: normal;/,
    );
    const mediaBlock = css.match(
      /@media \(max-width: 42rem\)\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(mediaBlock).toBeDefined();
    expect(mediaBlock).not.toMatch(/\.player-summary-skill-group/);
    expect(mediaBlock).not.toMatch(/\.player-summary-line2/);
  });

  it("uses a two-column mobile grid for tool categories and category tabs", () => {
    expect(css).toMatch(
      /\.tool-category-grid,\s*nav\.calculator-tabs:not\(\.compact\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
  });

  it("also uniformly splits the Outils category nav 2-per-row on mobile", () => {
    // Point 6: Villes/Combat/Classement/Compétences must wrap 2-per-line as
    // a real grid, not organically via flex-wrap (which left the longer
    // "Compétences" label alone, stretched, on its own line). The override
    // must come AFTER the unconditional `.category-nav { display: flex }`
    // base rule in source order, or the base rule wins the cascade at equal
    // specificity regardless of the media query matching.
    const baseRuleIndex = css.indexOf(".category-nav {\n  display: flex;");
    const overrideRuleIndex = css.indexOf(
      ".category-nav {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
    expect(baseRuleIndex).toBeGreaterThan(-1);
    expect(overrideRuleIndex).toBeGreaterThan(-1);
    expect(overrideRuleIndex).toBeGreaterThan(baseRuleIndex);
  });

  it("offsets the expanded mobile navigation below the header", () => {
    expect(css).toMatch(/\.public-header-nav\s*{[\s\S]*?margin-top: 0\.3rem/);
  });

  it("keeps all four summary colors at readable contrast in both themes", () => {
    const dark = css.match(
      /:root,\s*:root\[data-theme="dark"\]\s*{([\s\S]*?)\n}/,
    )?.[1];
    const light = css.match(
      /:root\[data-theme="light"\]\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(dark).toBeDefined();
    expect(light).toBeDefined();

    for (const theme of [dark!, light!]) {
      const background = variable(theme, "--bg-panel");
      for (const color of [
        "--summary-total",
        "--emerald-bright",
        "--violet-bright",
        "--sapphire-bright",
      ]) {
        expect(
          contrast(variable(theme, color)!, background!),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
