import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";

const css = readFileSync("src/app/globals.css", "utf8");

describe("Bloc 38 public reference/homepage styles", () => {
  it("A, D: sizes the Gemmes table's 6 league columns identically and centers them", () => {
    expect(css).toMatch(/\.gems-reference-table\s*{\s*table-layout: fixed;/);
    expect(css).toMatch(
      /\.gems-reference-table th,\s*\n\.gems-reference-table td\s*{\s*text-align: center;/,
    );
  });

  it("B, G: Combat/Expedition equipment images and Gemmes' image now share a single 3rem size", () => {
    expect(css).toMatch(
      /\.reference-equipment-image\s*{\s*display: block;\s*width: 3rem;\s*height: 3rem;/,
    );
  });

  // Bloc 64/C: the Boutique tiles that replaced the 4 category tables share
  // this same 5rem rule, so the selector now lists both.
  it("Bloc46/A: Consommables' own image size is 5rem (table and tile), distinct from the shared 3rem rule", () => {
    const rule = css.match(
      /\.consumables-table \.reference-equipment-image,\n\.consumable-tile-image\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 5rem;/);
    expect(rule).toMatch(/height: 5rem;/);
  });

  it("C: wraps the Gemmes image and its % value in one inline-flex row", () => {
    expect(css).toMatch(/\.gems-value-row\s*{\s*display: inline-flex;/);
  });

  it("H: the shared category/reference tile image is a strict square", () => {
    expect(css).toMatch(
      /\.tool-category-image\s*{\s*position: relative;\s*aspect-ratio: 1;/,
    );
  });

  it("I: halves .home-tools' own top margin, leaving .home-guides' untouched", () => {
    expect(css).toMatch(
      /\.home-tools\s*{\s*margin-top: clamp\(1\.5rem, 4vw, 3\.5rem\);\s*}/,
    );
    expect(css).toMatch(
      /\.home-guides\s*{\s*margin-top: clamp\(3rem, 8vw, 7rem\);\s*}/,
    );
  });

  it("L: excludes .tools-page-title/.reference-page-title from the generic hero-title rule that was overriding their own font-size clamp", () => {
    const match = css.match(
      /\.hero h1,\s*\n\.public-main\s*> h1([^,{]*),\s*\n\.guide-shell h1\s*{/,
    );
    expect(match).not.toBeNull();
    expect(match![1]).toContain(":not(.tools-page-title)");
    expect(match![1]).toContain(":not(.reference-page-title)");
  });

  // Bloc 53/D: /guides and /referentiels get the same smaller-title
  // treatment, added to the same exclusion list above.
  it("Bloc53/D: also excludes .guides-page-title/.referentiels-page-title from the generic hero-title rule", () => {
    const match = css.match(
      /\.hero h1,\s*\n\.public-main\s*> h1([^,{]*),\s*\n\.guide-shell h1\s*{/,
    );
    expect(match).not.toBeNull();
    expect(match![1]).toContain(":not(.guides-page-title)");
    expect(match![1]).toContain(":not(.referentiels-page-title)");
  });

  it("M: gives Level Up/Templiers/Gemmes' shared table class alternating row colors", () => {
    expect(css).toMatch(
      /\.reference-simple-table tbody tr:nth-child\(even\)\s*{\s*background: var\(--bg-panel-raised\);/,
    );
  });

  it("N: caps the tool-category/reference grid at 4 columns per row instead of a variable auto-fit count", () => {
    expect(css).toMatch(
      /\.tool-category-grid\s*{\s*display: grid;\s*grid-template-columns: repeat\(auto-fit, minmax\(max\(13\.5rem, calc\(\(100% - 3 \* 1rem\) \/ 4\)\), 1fr\)\);/,
    );
  });

  it("Bloc 50 Group3: caps the homepage guides teaser grid at 3 columns per row, same computed-floor technique as .tool-category-grid", () => {
    expect(css).toMatch(
      /\.home-guides-grid\s*{\s*grid-template-columns: repeat\(\s*auto-fit,\s*minmax\(max\(18rem, calc\(\(100% - 2 \* 0\.65rem\) \/ 3\)\), 1fr\)\s*\);/,
    );
    expect(css).toMatch(
      /@media \(max-width: 42rem\)\s*{\s*\.home-guides-grid\s*{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  it("P: removes the browser increment/decrement arrows on every admin numeric field", () => {
    expect(css).toMatch(
      /main\.admin-main input\[type="number"\]\s*{\s*appearance: textfield;\s*}/,
    );
    expect(css).toMatch(
      /main\.admin-main input\[type="number"\]::-webkit-inner-spin-button,\s*\nmain\.admin-main input\[type="number"\]::-webkit-outer-spin-button\s*{\s*appearance: none;/,
    );
  });

  it("K: /tools' title and intro sentence are word-for-word the homepage's tools section", () => {
    for (const messages of [frMessages, enMessages]) {
      expect(messages.tools.title).toBe(messages.Home.toolsTitle);
      expect(messages.tools.subtitle).toBe(messages.Home.toolsDescription);
    }
  });

  it("Q: doubles Expedition's grid-layout auxiliary tables' numeric fields, scoped to a modifier class", () => {
    // Bloc 41/E: the table-layout variant of this rule (below) dropped back
    // to 9rem — it's now exclusively Combat's Pouciel/gem-slots tables,
    // where 18rem overflowed. The grid-layout variant (Expedition's
    // increments/merge-cost/dismantle) is unaffected.
    expect(css).toMatch(
      /\.reference-admin-wide-inputs \.reference-admin-grid-field input\s*{\s*width: 100%;\s*min-width: min\(12rem, 100%\);/,
    );
  });
});

describe("Bloc 39: Combat/Expedition reference tile grid", () => {
  it("stacks set-blocks 2 per row (6 tiles wide) in a fixed 2-column grid, each its own 3-column tile grid", () => {
    // Bloc 41/B: a fixed grid, not flex — flex-grow let a lone last block
    // stretch to fill the row (see the "Bloc 41" describe block below).
    expect(css).toMatch(
      /\.reference-tile-blocks\s*{\s*display: grid;\s*grid-template-columns: repeat\(2, 1fr\);/,
    );
    expect(css).toMatch(
      /\.reference-tile-grid\s*{\s*display: grid;\s*grid-template-columns: repeat\(3, 1fr\);/,
    );
  });

  it("Bloc 40/D-F: no longer defines a dim/opacity class for filtered-out blocks — they're removed from the DOM instead", () => {
    expect(css).not.toMatch(/\.reference-tile-block-dim/);
  });

  it("settles on 2 tile-wide on mobile (tried empirically against 1, see PR report) with a single-column block layout", () => {
    expect(css).toMatch(
      /\.reference-tile-blocks\s*{\s*grid-template-columns: 1fr;\s*}\s*\/\*[\s\S]*?\*\/\s*\.reference-tile-grid\s*{\s*grid-template-columns: repeat\(2, 1fr\);/,
    );
  });

  it("drops the star-level filter column — family/rarity now split the filter row evenly", () => {
    expect(css).toMatch(
      /\.reference-filters\s*{\s*display: grid;\s*grid-template-columns: 1fr 1fr;/,
    );
    expect(css).not.toMatch(/\.reference-star-filter/);
    expect(css).not.toMatch(/\.reference-filters-wide-family/);
  });

  it("no longer defines the old per-row .rarity-badge pill (rarity is now the tile's own bg/border)", () => {
    expect(css).not.toMatch(/\.rarity-badge/);
  });

  it("drops the star-level filter and row-count strings from both references' messages", () => {
    for (const messages of [frMessages, enMessages]) {
      expect(messages.references.filters).not.toHaveProperty("star-level");
      expect(messages["combat-equipment"]).not.toHaveProperty("row-count");
      expect(messages["expedition-equipment"]).not.toHaveProperty("row-count");
      expect(messages["combat-equipment"]).toHaveProperty("gem-count");
      // Bloc 40/D-F: the "dimmed, doesn't match filters" hint no longer
      // applies now that filtering hides tiles outright.
      expect(messages.references.filters).not.toHaveProperty("dimmed-hint");
    }
  });
});

describe("Bloc 40: reference tile fixes", () => {
  it("G: centers each skill/stat line within the skills column, scoped to the tile", () => {
    expect(css).toMatch(
      /\.reference-tile-skills \.skill-value-row\s*{\s*justify-content: center;\s*}/,
    );
  });

  it('H: sizes .reference-tile-skills at 0.69em so "Consommables" + its % fit on one line', () => {
    const rule = css.match(/\.reference-tile-skills\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/font-size: 0\.69em;/);
  });
});

describe("Bloc 41: referentiel fixes", () => {
  it("B: a set block has no flex-grow rule left anywhere — a fixed grid track is what keeps a lone block at exactly 50%", () => {
    // The block itself carries no sizing rule at all now (the grid gives it
    // one column implicitly) — just confirm the old flex-basis/flex-grow
    // rule is gone, on desktop and mobile alike.
    expect(css).not.toMatch(/\.reference-tile-block\s*{\s*flex:/);
  });

  it("C: adds breathing room under the référentiels switcher specifically, not the shared category-nav (so /tools' banner is untouched)", () => {
    expect(css).toMatch(
      /\.reference-switcher\s*{\s*margin-bottom: 1\.5rem;\s*}/,
    );
  });

  it("E: the table-layout wide-input rule (now exclusively Combat's Pouciel/gem-slots tables) drops back from 18rem to 9rem", () => {
    expect(css).toMatch(
      /\.reference-admin-wide-inputs \.reference-admin-table input\s*{\s*min-width: 9rem;\s*}/,
    );
  });
});

describe("Bloc 53: Boutique admin columns + intro pages + cross-links", () => {
  it("B: every Boutique input (Nom/Description and Coût alike) fills its column width, scoped away from the shared .reference-admin-table/.reference-admin-narrow rules", () => {
    expect(css).toMatch(
      /\.consumables-admin-table input,\s*\n\.consumables-admin-table select\s*{\s*width: 100%;/,
    );
  });

  // Codex review (PR #75): Coût's input previously kept the shared
  // .reference-admin-narrow's fixed 6.75rem width while its own td shrank
  // to 12% of the table — on a narrow admin viewport the input then
  // overflowed its cell into .ranking-table-wrap's own horizontal scroll,
  // reintroducing the exact bug A-C exist to remove.
  it("B fix: Coût's input is no longer excluded from the width: 100% rule", () => {
    expect(css).not.toMatch(
      /\.consumables-admin-table td:not\(\.reference-admin-narrow\)/,
    );
  });

  it("C: gives Boutique's Description column relatively more width than its neighbours", () => {
    expect(css).toMatch(
      /\.consumables-admin-table \.reference-admin-wide\s*{\s*width: 36%;\s*}/,
    );
  });

  it("A-C: the Boutique table fills its container width instead of the shared table's min-width: max-content (the historical horizontal-scroll trigger)", () => {
    const rule = css.match(/\.consumables-admin-table\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/table-layout: fixed;/);
    // Codex review (PR #75): a bare 100% still let table-layout: fixed's
    // per-column rounding sum to a few px past the container on some
    // widths — this small buffer is what actually keeps
    // .ranking-table-wrap from gaining its own horizontal scroll.
    expect(rule).toMatch(/width: calc\(100% - 28px\);/);
    expect(rule).toMatch(/min-width: 0;/);
  });

  it("D: /guides and /referentiels get their own smaller title class, excluded from the generic hero-title rule", () => {
    expect(css).toMatch(
      /\.guides-page-title,\s*\n\.referentiels-page-title\s*{/,
    );
  });

  it("E: the cross-reference banner/mini-card CSS replaces the old plain-text .reference-cross-link rule", () => {
    expect(css).not.toMatch(/\.reference-cross-link\s*{/);
    expect(css).toMatch(/\.cross-reference-banner\s*{/);
    expect(css).toMatch(/\.cross-reference-card\s*{/);
  });
});

describe("Bloc 54: missing Combat/Expedition cross-link + bigger banner", () => {
  // B: the phrase used to be a separate .cross-reference-label <p> above
  // the button — it's now folded inside the button via .cross-reference-text,
  // and there is no longer a rule styling .cross-reference-label as its own
  // block-level line above the card.
  it("B: the label lives inside .cross-reference-text, not as a standalone line above the button", () => {
    expect(css).toMatch(/\.cross-reference-text\s*{/);
    const bannerRule = css.match(
      /\.cross-reference-banner\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(bannerRule).toBeDefined();
    expect(bannerRule).not.toMatch(/flex-direction: column/);
  });

  // B: the thumbnail matches Boutique's own reference-table image size
  // (Bloc 46/A), up from the original 2.25rem.
  it("B: sizes the cross-reference thumbnail at 5rem, matching Boutique's reference-table image size", () => {
    const rule = css.match(/\.cross-reference-thumb\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 5rem;/);
    expect(rule).toMatch(/height: 5rem;/);
  });
});

describe("Bloc 64: Boutique tiles, Level Up pagination, Templiers split", () => {
  // C: 2 tiles per row on desktop, 1 on mobile.
  it("C: lays the Boutique tiles out 2 per row, dropping to 1 column on mobile", () => {
    const rule = css.match(/\.consumable-tile-grid\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.consumable-tile-grid\s*{\s*\n\s*grid-template-columns: 1fr;/,
    );
  });

  // C: grey tile (the neutral surface token), violet cost badge (the
  // site's own accent) — not a one-off color either way.
  it("C: gives the tile the grey surface and the cost badge the violet accent", () => {
    const tile = css.match(/\.consumable-tile\s*{([\s\S]*?)\n}/)?.[1];
    expect(tile).toBeDefined();
    expect(tile).toMatch(/background: var\(--surface-muted\)/);
    const cost = css.match(/\.consumable-tile-cost\s*{([\s\S]*?)\n}/)?.[1];
    expect(cost).toBeDefined();
    expect(cost).toMatch(/color: var\(--accent-strong\)/);
    // Kept on the name's line at the tile's right edge.
    const heading = css.match(
      /\.consumable-tile-heading\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(heading).toMatch(/justify-content: space-between/);
  });

  // D: the pagination buttons are styled by the very rule that styles the
  // league/family navigation buttons — one shared declaration, so the two
  // can't drift apart.
  it("D: styles the Level Up pagination buttons with the site's navigation-button rule", () => {
    expect(css).toMatch(
      /\.family-buttons button,\n\.family-buttons a,\n\.pagination button\s*{/,
    );
    expect(css).toMatch(/\.pagination button:disabled\s*{/);
  });

  // E: Templiers reuses Level Up's 2-column split, including its
  // single-column mobile fallback.
  it("E: shares Level Up's 2-column split layout with the Templiers tables", () => {
    expect(css).toMatch(
      /\.level-up-tables,\n\.split-reference-tables\s*{\s*\n\s*display: grid;\s*\n\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(css).toMatch(
      /\.level-up-tables,\n\s*\.split-reference-tables\s*{\s*\n\s*grid-template-columns: 1fr;/,
    );
  });
});
