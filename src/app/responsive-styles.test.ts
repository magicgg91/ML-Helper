import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { narrowViewportMaxWidth } from "../components/use-narrow-viewport";
import { rankCategoryShade, rankMovements } from "../lib/ranking";

/** Every shade the range palette can produce, for the contrast checks below. */
const rankCategoryShades = rankMovements.flatMap((movement) =>
  Array.from({ length: 5 }, (_, index) => rankCategoryShade(movement, index)),
);

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
  // Bloc 63/A+C: the reference tables' breakpoint is written twice — once in
  // this stylesheet, which arranges the tables, and once in TypeScript, which
  // is where a paginated table decides how many levels a page holds. They
  // have to be the same number, or Progression would switch to one table per
  // page at a width where the stylesheet still lays out two columns.
  it("declares the reference tables' breakpoint at the same width in CSS and in TS", () => {
    const stacking = css.match(
      /@media \(max-width: (\d+)px\)\s*{\s*\.level-up-tables,\s*\.split-reference-tables\s*{\s*grid-template-columns: 1fr;/,
    );
    expect(stacking, "the ≤breakpoint stacking rule").not.toBeNull();
    expect(Number(stacking![1])).toBe(narrowViewportMaxWidth);
  });

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

  // Bloc 109: the Classement picker can now run to several rows, and the
  // brief is explicit that its half of the field must not move when it does.
  // The 50% lives on the FIELD, not on the button group — so splitting the
  // buttons cannot touch it, and this pins that it stays unconditional:
  // outside any media query, with no count in sight.
  it("keeps the Classement league field at 50% for any number of buttons", () => {
    const rule = /\.ranking-league-field\s*{\s*flex: 0 0 50%;\s*}/;
    expect(css).toMatch(rule);
    // Not inside a breakpoint: every @media block must be free of it.
    for (const block of css.matchAll(/@media[^{]*{([\s\S]*?)\n}/g))
      expect(block[1]).not.toMatch(/\.ranking-league-field\s*{/);
  });

  // The multi-row layout stacks rows and lets each share its width; the split
  // itself is computed in TypeScript, because it differs between widths —
  // two fixed columns on a phone since Bloc 110/1, ceil(N/2)+floor(N/2) on
  // desktop — and the stylesheet only ever sees the rows the component chose.
  it("stacks the Classement picker's rows without touching the field", () => {
    expect(css).toMatch(
      /\.family-buttons\.league-buttons-rows\s*{\s*display: flex;\s*flex-direction: column;/,
    );
    expect(css).toMatch(/\.league-button-row\s*{\s*display: flex;/);
    expect(css).toMatch(/\.league-button-row > button\s*{\s*flex: 1 1 0;/);
  });

  // Bloc 112: the range tiles' two layouts. Desktop is one row of three
  // groups; a phone is four rows, which only works because the two position
  // wrappers go display:contents there — that is what lets the percentile sit
  // beside the result while the ranks sit beside the rewards, from one set of
  // markup rather than two.
  it("lays a Classement range tile out as one desktop row and four mobile rows", () => {
    const desktop = css.match(
      new RegExp(
        `@media \\(min-width: ${narrowViewportMaxWidth + 1}px\\) \\{\\s*\\.ranking-range-tile \\{([\\s\\S]*?)\\n  \\}`,
      ),
    )?.[1];
    expect(desktop, "the desktop tile rule").toBeDefined();
    expect(desktop).toMatch(/grid-template-columns: 230px minmax\(0, 1fr\)/);

    const mobile = css.match(
      new RegExp(
        `@media \\(max-width: ${narrowViewportMaxWidth}px\\) \\{\\s*\\.ranking-range-tile \\{([\\s\\S]*?)\\n  \\}`,
      ),
    )?.[1];
    expect(mobile, "the mobile tile rule").toBeDefined();
    expect(mobile).toMatch(/"result percentile"/);
    expect(mobile).toMatch(/"ranks rewards"/);
    expect(mobile).toMatch(/"bar bar"/);
    expect(mobile).toMatch(/"bubble bubble"/);
    expect(css).toMatch(
      /\.ranking-range-position,\s*\.ranking-range-position-top \{\s*display: contents;/,
    );
  });

  // The League Lock chip: beside the heading on a desktop row, under it on a
  // phone. The header is a flex row unconditionally and only turns into a
  // column at the breakpoint.
  it("drops Classement's League Lock chip under the heading on a phone", () => {
    expect(css).toMatch(
      /\.ranking-ranges-header \{\s*display: flex;[\s\S]*?justify-content: space-between;/,
    );
    const mobile = css.match(
      new RegExp(
        `@media \\(max-width: ${narrowViewportMaxWidth}px\\) \\{\\s*\\.ranking-ranges-header \\{([\\s\\S]*?)\\n  \\}`,
      ),
    )?.[1];
    expect(mobile, "the mobile header rule").toBeDefined();
    expect(mobile).toMatch(/flex-direction: column;/);
    expect(mobile).toMatch(/align-items: flex-start;/);
  });

  // The top range is 1% of the ladder and would otherwise be a hairline.
  it("keeps the narrowest range segment visible", () => {
    expect(css).toMatch(
      /\.ranking-range-bar-segment \{[\s\S]*?min-width: 5px;/,
    );
  });

  // Bloc 113/A.10: the Villes tiles are one equal row on a desktop and two
  // per row on a phone, where the headline tile spans both columns.
  it("lays the Villes tiles out two per row on a phone", () => {
    expect(css).toMatch(/\.tool-tiles \{\s*display: flex;/);
    const mobile = css.match(
      new RegExp(
        `@media \\(max-width: ${narrowViewportMaxWidth}px\\) \\{\\s*(?:/\\*[\\s\\S]*?\\*/\\s*)?\\.tool-tiles \\{([\\s\\S]*?)\\n  \\}`,
      ),
    )?.[1];
    expect(mobile, "the mobile .tool-tiles rule").toBeDefined();
    expect(mobile).toMatch(
      /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(css).toMatch(/\.tool-tile-wide \{\s*grid-column: 1 \/ -1;/);
  });

  // The two breakdowns sit side by side on a desktop — Armée then Or — and
  // stack on a phone, where two tables would each be too narrow to read.
  it("stacks the Villes breakdowns and reward cards on a phone", () => {
    expect(css).toMatch(
      /\.tool-breakdowns \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/,
    );
    const mobile = css.match(
      new RegExp(
        `@media \\(max-width: ${narrowViewportMaxWidth}px\\)[\\s\\S]*?\\.tool-breakdowns,\\s*\\.tool-reward-cards,\\s*\\.tool-reward-fields \\{([\\s\\S]*?)\\n  \\}`,
      ),
    )?.[1];
    expect(mobile, "the mobile stacking rule").toBeDefined();
    expect(mobile).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
    // The two reskill tiles stack as well: "Armée si full Recruteur" does
    // not fit half a phone.
    const reskill = css.match(
      /\n  \.tool-tiles-reskill \{([\s\S]*?)\n  \}/,
    )?.[1];
    expect(reskill, "the mobile reskill rule").toBeDefined();
    expect(reskill).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
  });

  // A source name wraps between words on a phone, never inside one: with
  // `anywhere` the column may shrink below its longest word, which printed
  // "Temple" as "Templ / e" in the Armée breakdown at 393px.
  it("wraps a breakdown source name between words, not inside one", () => {
    // The two-space indent is the rule inside the phone media query; the
    // unconditional rule for the same selector is flush left.
    const mobile = css.match(
      /\n  \.tool-table tbody th,\n  \.tool-table tfoot th \{([\s\S]*?)\n  \}/,
    )?.[1];
    expect(mobile, "the mobile source-name rule").toBeDefined();
    expect(mobile).toMatch(/overflow-wrap: break-word;/);
    expect(mobile).not.toMatch(/overflow-wrap: anywhere;/);
  });

  it("uses a two-column mobile grid for category tabs", () => {
    expect(css).toMatch(
      /nav\.calculator-tabs:not\(\.compact\)\s*{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
  });

  it("uses a two-column mobile grid for the tool category cards, after the base rule", () => {
    // Bloc 27/4: same cascade-order bug Bloc 25 fixed for .category-nav,
    // confirmed present here too — the override must come textually AFTER
    // the unconditional `.tool-category-grid { display: grid; ... }` base
    // rule, or the base rule's grid-template-columns wins at equal
    // specificity regardless of the media query matching.
    const baseRuleIndex = css.indexOf(
      ".tool-category-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit,",
    );
    const overrideRuleIndex = css.indexOf(
      ".tool-category-grid {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
    expect(baseRuleIndex).toBeGreaterThan(-1);
    expect(overrideRuleIndex).toBeGreaterThan(-1);
    expect(overrideRuleIndex).toBeGreaterThan(baseRuleIndex);
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

  it("gives Combat's global summary the same responsive 5x2 grid as Expedition's (Bloc 33/I)", () => {
    expect(css).toMatch(
      /\.stuff-summary-grid,\s*\n\.expedition-summary-grid\s*{\s*display: grid;\s*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/,
    );
    // Bloc 68: anchored to the specific media block containing these 2
    // selectors, not just "the first @media (max-width: 900px) block in
    // the file" — that unanchored match broke the moment a later Bloc
    // inserted its own 900px block earlier in the file.
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.stuff-summary-grid,\s*\n\s*\.expedition-summary-grid\s*{([\s\S]*?)\n {2}}/,
    )?.[1];
    expect(mediaBlock).toBeDefined();
    expect(mediaBlock).toMatch(/repeat\(2, minmax\(0, 1fr\)\)/);
  });

  it("wraps Combat/Expedition's family buttons to a 2nd row on mobile instead of scrolling horizontally (Bloc 34/B)", () => {
    // Anchored to a standalone `.family-buttons {` selector at the start of
    // a line — Bloc 68/J+K's `.calculator-fields > .family-buttons { ... }`
    // rule also contains the substring ".family-buttons {" and, sitting
    // earlier in the file, was matched instead by an unanchored regex here.
    const rule = css.match(/(?:^|\n)\.family-buttons\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    // Desktop still never wraps (Bloc 31/H) — the family-buttons rule
    // itself keeps flex-wrap: nowrap outside any media query.
    expect(rule).toMatch(/flex-wrap: nowrap;/);
    const mobileOverride = css.match(
      /@media \(max-width: 900px\)\s*{\s*\.family-buttons\s*{([\s\S]*?)\n\s*}/,
    )?.[1];
    expect(mobileOverride).toBeDefined();
    expect(mobileOverride).toMatch(/flex-wrap: wrap;/);
  });

  it("wraps the /tools and /referentiels page titles on mobile instead of truncating them (Bloc 84)", () => {
    // Both titles keep their desktop nowrap+shrink-to-fit clamp() outside
    // any media query...
    const toolsRule = css.match(/(?:^|\n)\.tools-page-title\s*{([\s\S]*?)\n}/)?.[1];
    expect(toolsRule).toBeDefined();
    expect(toolsRule).toMatch(/white-space: nowrap;/);
    // ...but on mobile that nowrap is undone so a title too wide for the
    // viewport at the clamp()'s font-size floor wraps onto extra lines
    // instead of being visually cut off.
    const mobileOverride = css.match(
      /@media \(max-width: 900px\)\s*{\s*\.tools-page-title,\s*\n\s*\.referentiels-page-title\s*{([\s\S]*?)\n\s*}/,
    )?.[1];
    expect(mobileOverride).toBeDefined();
    expect(mobileOverride).toMatch(/white-space: normal;/);
  });

  // Bloc 112: the three result colors of the Classement range tiles carry
  // running text (the target league) on a tile whose background is a band
  // shade diluted onto the page background — so they must clear AA against
  // EVERY shade the palette can produce, in both themes, not just against a
  // flat --bg. The brief's own promotion green measured 4.27 on the lightest
  // of them, which is why the light theme's is 3 points darker.
  it("keeps Classement's result colors readable on every tinted tile", () => {
    const dark = css.match(
      /:root,\s*:root\[data-theme="dark"\]\s*{([\s\S]*?)\n}/,
    )?.[1];
    const light = css.match(
      /:root\[data-theme="light"\]\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(dark).toBeDefined();
    expect(light).toBeDefined();
    // The same dilution the stylesheet applies: 12% of the shade over --bg.
    const tint = (shade: string, background: string) => {
      const [a, b] = [rgb(shade), rgb(background)];
      return `#${a
        .map((channel, index) =>
          Math.round(channel * 0.12 + b[index]! * 0.88)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
    };
    for (const theme of [dark!, light!]) {
      const background = variable(theme, "--bg")!;
      const tiles = rankCategoryShades.map((shade) => tint(shade, background));
      for (const result of [
        "--rank-promotion",
        "--rank-stay",
        "--rank-relegation",
      ]) {
        const color = variable(theme, result)!;
        for (const tile of tiles)
          expect(
            contrast(color, tile),
            `${result} on ${tile}`,
          ).toBeGreaterThanOrEqual(4.5);
        // And the ink inside the badge, which is filled with that same color.
        expect(
          contrast(variable(theme, "--rank-strong-ink")!, color),
          `--rank-strong-ink on ${result}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      // The player's bubble is the same arrangement, on its own fixed hue.
      expect(
        contrast(
          variable(theme, "--rank-player-ink")!,
          variable(theme, "--rank-player")!,
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The player's marker must never be mistaken for a range's own color.
  it("keeps the player's color out of the range palette", () => {
    for (const theme of [
      css.match(/:root,\s*:root\[data-theme="dark"\]\s*{([\s\S]*?)\n}/)?.[1],
      css.match(/:root\[data-theme="light"\]\s*{([\s\S]*?)\n}/)?.[1],
    ]) {
      expect(theme).toBeDefined();
      expect(rankCategoryShades).not.toContain(
        variable(theme!, "--rank-player"),
      );
    }
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
