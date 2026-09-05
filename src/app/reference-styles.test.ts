import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";

const css = readFileSync("src/app/globals.css", "utf8");

describe("Bloc 38 public reference/homepage styles", () => {
  // Bloc 65/D: the same equal-width, centered treatment moved onto each
  // tile's own 6-league mini-table when the matrix table was replaced.
  it("A, D, Bloc65/D: sizes the 6 league columns identically and centers them, now inside each tile", () => {
    expect(css).toMatch(
      /\.gems-tile-table\s*{\s*\n\s*width: 100%;\s*\n\s*table-layout: fixed;/,
    );
    expect(css).toMatch(
      /\.gems-tile-table th,\n\.gems-tile-table td\s*{[\s\S]*?text-align: center;/,
    );
  });

  it("B, G: Combat/Expedition equipment images and Gemmes' image now share a single 3rem size", () => {
    expect(css).toMatch(
      /\.reference-equipment-image\s*{\s*display: block;\s*width: 3rem;\s*height: 3rem;/,
    );
  });

  // Bloc 65/A, C: every Boutique listing is a tile now (Intro included),
  // so one selector covers them all — at 6rem, up from 5rem.
  it("Bloc46/A, Bloc65/C: sizes every Boutique tile image at 6rem, distinct from the shared 3rem rule", () => {
    const rule = css.match(/\.consumable-tile-image\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 6rem;/);
    expect(rule).toMatch(/height: 6rem;/);
    expect(css).not.toMatch(/\.consumables-table \.reference-equipment-image/);
  });

  // Bloc 65/D: the Gemmes matrix table (and the .gems-value-row that
  // paired an image with its % inside one of its cells) is gone — the
  // tile's own mini-table puts the two on their own rows instead.
  it("C, Bloc65/D: no longer carries the Gemmes table's own rules", () => {
    expect(css).not.toMatch(/\.gems-value-row/);
    expect(css).not.toMatch(/\.gems-reference-table/);
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

  // Bloc 68/D: the homepage reuses the Outils/Référentiels/Guides section
  // titles verbatim from /tools, /referentiels and /guides — but those 3
  // pages render theirs as a real <h1>, which picks up the gradient
  // clipped-text violet from the "Prototype visual language" h1 rule
  // (~line 1471), while the homepage rendered the same text as a plain
  // var(--text) <h2> that never inherited it.
  it("Bloc68/D: gives the homepage's Outils/Référentiels/Guides section titles the same gradient violet clip as their h1 counterparts", () => {
    const rule = css.match(
      /\.home-tools h2,\n\.home-references h2,\n\.home-guides h2\s*{([\s\S]*?)\n}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(
      /background: linear-gradient\(110deg, var\(--accent-strong\), var\(--accent\)\);/,
    );
    expect(rule).toMatch(/color: transparent;/);
    expect(rule).toMatch(/background-clip: text;/);
    expect(rule).not.toMatch(/color: var\(--text\);/);
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
      // Bloc 83: the tile-level gem-count badge is gone entirely (it was
      // the mislabeled "cost badge" regression) — the key no longer exists.
      expect(messages["combat-equipment"]).not.toHaveProperty("gem-count");
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

  // Bloc 65/B: Description now takes the width the table actually has —
  // near half of it — instead of merely leading its neighbours, the share
  // coming from Actions and Coût.
  it("C, Bloc65/B: gives Boutique's Description column the bulk of the table width", () => {
    const width = (selector: string) =>
      Number(
        css.match(
          new RegExp(
            `\\.consumables-admin-table ${selector}\\s*{\\s*width: (\\d+)%;`,
          ),
        )?.[1],
      );
    const description = width("\\.reference-admin-wide");
    expect(description).toBe(48);
    expect(width("\\.reference-admin-narrow")).toBe(10);
    // Every other column is far behind it, and the 5 still sum to 100%.
    const actions = Number(
      css.match(
        /\.consumables-admin-table th:last-child,\n\.consumables-admin-table td:last-child\s*{\s*width: (\d+)%;/,
      )?.[1],
    );
    expect(actions).toBe(14);
    const unmarked = (100 - description - 10 - actions) / 2;
    expect(unmarked).toBe(14);
    expect(description).toBeGreaterThan(3 * unmarked);
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
    expect(rule).toMatch(
      /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
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

describe("Bloc 68/B: Boutique tile cost badge moves under the name, mobile only", () => {
  it("stacks the heading into a column on mobile, badge under the name", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.consumable-tile-grid\s*{\s*\n\s*grid-template-columns: 1fr;\s*\n\s*}\s*\n[\s\S]*?\n\s*\.consumable-tile-heading\s*{\s*\n\s*flex-direction: column;\s*\n\s*align-items: flex-start;/,
    );
  });

  // Desktop must stay exactly as Bloc 64/C left it: a row, badge at the
  // top-right via space-between — the mobile override above must not leak
  // into the base (non-media-query) rule.
  it("leaves the desktop rule untouched: still a row, still space-between", () => {
    const heading = css.match(/\.consumable-tile-heading\s*{([\s\S]*?)\n}/)?.[1];
    expect(heading).toBeDefined();
    expect(heading).toMatch(/justify-content: space-between/);
    expect(heading).not.toMatch(/flex-direction/);
  });
});

describe("Bloc 65: Boutique tiles, Gemmes tiles, Classement filter bar", () => {
  // A + C: the Intro grid and the category grids are the same rule, so
  // one 6rem image size and one tile style cover both.
  it("A, C: styles every Boutique tile (Intro included) from one shared rule, images at 6rem", () => {
    expect(css).toMatch(/\.consumable-tile-grid\s*{/);
    const image = css.match(/\.consumable-tile-image\s*{([\s\S]*?)\n}/)?.[1];
    expect(image).toMatch(/width: 6rem;/);
    // No Intro-specific tile or image variant: the Intro reuses the same
    // classes, which is what keeps the two visually identical.
    expect(css).not.toMatch(/\.consumable-intro-tile/);
  });

  // D: 2 tiles per row, the mini-tables equal-width and centered, and the
  // Coût tile spanning the full grid in neutral grey.
  it("D: lays out the Gemmes tiles, with the Coût tile spanning the grid in grey", () => {
    const grid = css.match(/\.gems-tile-grid\s*{([\s\S]*?)\n}/)?.[1];
    expect(grid).toMatch(
      /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
    const cost = css.match(/\.gems-cost-tile\s*{([\s\S]*?)\n}/)?.[1];
    expect(cost).toMatch(/grid-column: 1 \/ -1;/);
    expect(cost).toMatch(/background: var\(--surface-muted\)/);
    const table = css.match(/\.gems-tile-table\s*{([\s\S]*?)\n}/)?.[1];
    expect(table).toMatch(/table-layout: fixed;/);
    expect(table).toMatch(/width: 100%;/);
  });

  // D: "même design sur mobile et desktop" — the tiles stack into a single
  // column on a phone, but a tile's own mini-table never changes: all 6
  // leagues stay side by side, which is the comparison this reference is
  // for.
  it("D: keeps each tile's 6-league mini-table intact on mobile, only stacking the grid", () => {
    const mobile = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.gems-tile-grid\s*{([\s\S]*?)\n {2}}/,
    )?.[1];
    expect(mobile).toMatch(/grid-template-columns: 1fr;/);
    // Nothing else about the tiles changes at that breakpoint.
    expect(css).not.toMatch(
      /@media[^{]*{[^}]*\.gems-tile-table\s*{[^}]*display:/,
    );
  });

  // B: the widened Description must not cost the table its no-scroll
  // guarantee — the 5 column shares still sum to exactly 100% at every
  // breakpoint, which is what keeps the table inside its wrapper
  // (measured live from 1400px down to 320px; see the PR report).
  it("B: keeps the column shares summing to 100% at every breakpoint", () => {
    const shares = (block: string) => {
      const wide = Number(
        block.match(/\.reference-admin-wide\s*{\s*width: (\d+)%;/)?.[1],
      );
      const narrow = Number(
        block.match(/\.reference-admin-narrow\s*{\s*width: (\d+)%;/)?.[1],
      );
      const actions = Number(
        block.match(/td:last-child\s*{\s*width: (\d+)%;/)?.[1],
      );
      // Image and Nom carry no width of their own: table-layout: fixed
      // splits whatever is left between them.
      return { wide, narrow, actions, rest: 100 - wide - narrow - actions };
    };
    const desktop = shares(
      css.slice(css.indexOf(".consumables-admin-table .reference-admin-wide")),
    );
    expect(desktop.rest).toBeGreaterThan(0);
    // Below 480px the icons need their column back, so Description gives
    // some of it up — still summing to 100%.
    const phoneBlock = css.match(
      /@media \(max-width: 480px\) {([\s\S]*?)\n}/,
    )?.[1];
    const phone = shares(phoneBlock ?? "");
    expect(phone.wide).toBeLessThan(desktop.wide);
    expect(phone.actions).toBeGreaterThan(desktop.actions);
    expect(phone.rest).toBeGreaterThan(0);
  });

  // E: the 3 fields spread edge to edge instead of bunching left.
  it("E: spreads the Classement filter bar across the full width of its block", () => {
    const rule = css.match(/\.ranking-fields\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toMatch(/display: flex;/);
    expect(rule).toMatch(/justify-content: space-between;/);
  });
});

describe("Bloc 66: Templiers presentation tiles, tile-title harmonization", () => {
  // B: same image-left layout and 6rem size as Boutique (Bloc 65/C), 3
  // tiles per row on desktop (Bloc 68/A: 5 Templiers = 3+2), 1 on mobile
  // like Boutique/Gemmes.
  it("B: lays the Templiers tiles out 3 per row, dropping to 1 column on mobile, images at 6rem", () => {
    const grid = css.match(/\.templars-tile-grid\s*{([\s\S]*?)\n}/)?.[1];
    expect(grid).toBeDefined();
    expect(grid).toMatch(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.templars-tile-grid\s*{\s*\n\s*grid-template-columns: 1fr;/,
    );
    const image = css.match(/\.templars-tile-image\s*{([\s\S]*?)\n}/)?.[1];
    expect(image).toBeDefined();
    expect(image).toMatch(/width: 6rem;/);
    expect(image).toMatch(/height: 6rem;/);
  });

  // C: Boutique, Gemmes and Templiers' own tile titles now share the same
  // 1.1rem size, up from the 0.9rem Boutique/Gemmes carried before.
  it("C: harmonizes all 3 tile-title selectors (Boutique, Gemmes, Templiers) at 1.1rem", () => {
    for (const selector of [
      "consumable-tile-name",
      "gems-tile-title",
      "templars-tile-title",
    ]) {
      const rule = css.match(new RegExp(`\\.${selector}\\s*{([\\s\\S]*?)\\n}`))?.[1];
      expect(rule, selector).toBeDefined();
      expect(rule, selector).toMatch(/font-size: 1\.1rem;/);
    }
  });
});

// Bloc 68: shared mobile-only grid modifiers, laid down once so every
// consumer (Boutique's category filter, Combat/Expedition's family/rarity
// filters, Événements/Progression's league buttons) references the exact
// same rule instead of each defining its own near-duplicate.
describe("Bloc 68: shared mobile filter/league-button grid modifiers", () => {
  it("L, M: .reference-filter-grid-2 forms a full-width 2-column grid, mobile only", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.reference-filter-grid-2\s*{\s*\n\s*display: grid;\s*\n\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  // M: deliberately 2 then 3, not a flat 2-column grid — and deliberately
  // keeps rarityOrder's existing rarest-to-commonest DOM order (Légendaire,
  // Mythique first) rather than "correcting" it to Commun→Légendaire.
  it("M: .reference-filter-grid-rarity splits 5 buttons 2-then-3 across 2 rows, mobile only", () => {
    const rule = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.reference-filter-grid-rarity\s*{([\s\S]*?)\n {2}}/,
    )?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/);
    expect(css).toMatch(
      /\.reference-filter-grid-rarity button:nth-child\(1\),\s*\n\s*\.reference-filter-grid-rarity button:nth-child\(2\)\s*{\s*\n\s*grid-column: span 3;/,
    );
    expect(css).toMatch(
      /\.reference-filter-grid-rarity button:nth-child\(3\),\s*\n\s*\.reference-filter-grid-rarity button:nth-child\(4\),\s*\n\s*\.reference-filter-grid-rarity button:nth-child\(5\)\s*{\s*\n\s*grid-column: span 2;/,
    );
  });

  it("N: .league-buttons-grid forms a full-width 3-column grid (2 rows of 3 for 6 leagues), mobile only", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.league-buttons-grid\s*{\s*\n\s*display: grid;\s*\n\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
    );
  });

  // H+I: Player Settings' .settings-grid sections (equipment/points/
  // templars/clan-temple) go 2-column on mobile, and within the primary
  // fields grid specifically, the first child (the league LeagueButtons
  // group, since F) spans the full row so Level/VP share the row below it.
  it("H+I: Player Settings' .settings-grid sections go 2-column on mobile, with the primary grid's first child (league) spanning the full row", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.settings-grid\s*{\s*\n\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);\s*\n\s*}\s*\n\s*\.settings-grid-primary > :first-child\s*{\s*\n\s*grid-column: 1 \/ -1;/,
    );
  });

  // Follow-up to H: the Level field has no unit select, so an even 1fr/1fr
  // split left its NumberStepper visibly wider than VP's. On mobile only,
  // VP's column gets extra width and its unit select shrinks, so the two
  // NumberSteppers end up close to the same width. Bloc 69/D: Level's own
  // share is reduced a further 10% (5fr -> 4.5fr), handed to VP (7fr ->
  // 7.5fr).
  it("gives the mobile Level/VP row an uneven column split and a narrower VP unit select, so both NumberSteppers end up close in width", () => {
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {([\s\S]*?)\n}\n(?!@media)/,
    )?.[0];
    expect(mediaBlock).toMatch(
      /\.settings-grid-primary\s*{\s*\n\s*grid-template-columns: minmax\(0, 4\.5fr\) minmax\(0, 7\.5fr\);/,
    );
    expect(mediaBlock).toMatch(
      /\.settings-grid-primary \.unit-input\s*{\s*\n\s*grid-template-columns: minmax\(0, 1fr\) 3\.1rem;/,
    );
    expect(mediaBlock).toMatch(
      /\.settings-grid-primary \.unit-input select\s*{\s*\n\s*padding: 0 0\.3rem;/,
    );
  });

  // Bloc 71/D, desktop: League/Level/VP now share a single row (reversing
  // Bloc 69/D's "League spans alone, Level/VP split 25% each below it") —
  // a 5:2:3 column grid (50%/20%/30%), with VP's own unit-input split 2:1
  // internally so its NumberStepper lands at 20% of the row and the unit
  // select at 10%.
  it("gives Player Settings' primary grid a 5:2:3 desktop column split (League/Level/VP), not the old 4-equal-columns-with-League-spanning", () => {
    const desktopRuleIndex = css.indexOf(
      ".settings-grid-primary {\n  grid-template-columns: 5fr 2fr 3fr;\n}",
    );
    const desktopUnitInputIndex = css.indexOf(
      ".settings-grid-primary .unit-input {\n  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);\n}",
    );
    const mediaQueryIndex = css.indexOf("@media (max-width: 900px) {");
    expect(desktopRuleIndex).toBeGreaterThan(-1);
    expect(desktopUnitInputIndex).toBeGreaterThan(-1);
    // Both rules must sit before the mobile media query, i.e. apply
    // unconditionally (desktop included), not just under it.
    expect(desktopRuleIndex).toBeLessThan(mediaQueryIndex);
    expect(desktopUnitInputIndex).toBeLessThan(mediaQueryIndex);
    // The old desktop-wide full-span rule for League is gone — only the
    // mobile-scoped one (inside the media query) should remain.
    expect(css).not.toMatch(
      /\.settings-grid-primary {\s*\n\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
    );
  });

  it("gives the league field a visible title matching the Level/VP fields' own label style", () => {
    expect(css).toMatch(
      /\.settings-grid-league-label\s*{\s*\n\s*color: var\(--muted\);\s*\n\s*font-size: 0\.78rem;\s*\n\s*font-weight: 700;/,
    );
  });
});

describe("Bloc 68/J+K review fixes: Codex findings on the PR", () => {
  it("keeps the disclosure arrow on the title itself, not as a 3rd flex item of .player-summary-row1 (space-between would push it away from the title)", () => {
    expect(css).not.toMatch(/\.player-summary-row1::before/);
    expect(css).toMatch(
      /#player-settings-title::before\s*{\s*\n\s*content: "▸";/,
    );
    expect(css).toMatch(
      /\.player-settings > details\[open\] > summary #player-settings-title::before\s*{\s*\n\s*content: "▾";/,
    );
  });

  // Superseded by Bloc 69/E, which explicitly asks for the league field to
  // share the row with the tool's other fields instead of being isolated
  // on its own — see the "Bloc 69/E" describe block below for the new
  // no-horizontal-scroll fix (wrap instead of full-row span).
});

// Bloc 68/C: the Templiers calculator's own fields+cost card — 3 equal
// columns (Niveau départ / Niveau cible / Coût total) on desktop, 1 column
// (stacked) on mobile. Dedicated class, distinct from the shared
// .calculator-fields used by Gems/City/DemoAttackTroops.
describe("Bloc 68/C: Templiers calculator fields+cost merge", () => {
  it("gives .templars-cost-fields 3 equal columns on desktop, 1 on mobile", () => {
    const rule = css.match(/\.templars-cost-fields\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.templars-cost-fields\s*{\s*\n\s*grid-template-columns: 1fr;/,
    );
  });
});

// Bloc 69/A: a banner button whose content wraps to 2 lines (e.g.
// "Équipement d'Expédition") grows taller than its single-line siblings on
// the same grid row; .category-btn is the shared class for both banners
// (.category-nav on /tools, .reference-switcher on /referentiels), so a
// flex + align-items:center fix here covers both at once.
describe("Bloc 69/A: banner buttons center their content vertically", () => {
  it("makes .category-btn a flex container centered on both axes, shared by the /tools and /referentiels banners", () => {
    const rule = css.match(/\.category-btn\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/display: flex;/);
    expect(rule).toMatch(/align-items: center;/);
    expect(rule).toMatch(/justify-content: center;/);
  });
});

// Bloc 69/G: the Ranking tool's desktop layout (Bloc 64/G, inline label
// before each control, single row) stays untouched — only a mobile-only
// override replaces it with a title-above-control stack, 2x3 league
// buttons, and full-width numeric fields.
describe("Bloc 69/G: Ranking mobile-only redesign", () => {
  it("stacks each ranking field's label above its control on mobile only, leaving the desktop inline-label rule untouched", () => {
    const desktopRule = css.match(/\.ranking-inline-field\s*{([\s\S]*?)\n}/)?.[1];
    expect(desktopRule).toBeDefined();
    expect(desktopRule).toMatch(/align-items: center;/);
    expect(desktopRule).not.toMatch(/flex-direction: column;/);
    // Anchored to the specific @media block containing .ranking-fields —
    // there are many "@media (max-width: 900px) {" blocks in this file, so
    // an unanchored match grabs the wrong one as soon as another Bloc
    // inserts its own block earlier (the exact bug fixed for a different
    // rule in responsive-styles.test.ts).
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.ranking-fields\s*{([\s\S]*?)\n}\n(?!@media)/,
    )?.[0];
    expect(mediaBlock).toBeDefined();
    expect(mediaBlock).toMatch(
      /\.ranking-fields\s*{\s*\n\s*flex-direction: column;\s*\n\s*align-items: stretch;/,
    );
    expect(mediaBlock).toMatch(
      /\.ranking-inline-field\s*{\s*\n\s*flex-direction: column;\s*\n\s*align-items: stretch;/,
    );
    expect(mediaBlock).toMatch(
      /\.ranking-number-field\s*{\s*\n\s*flex: 1 1 auto;/,
    );
    expect(mediaBlock).toMatch(
      /\.ranking-number-field \.number-stepper\s*{\s*\n\s*width: 100%;/,
    );
  });
});

// Bloc 71/B: reverses the Bloc 69 exclusion — Classement's desktop league
// field now joins the Villes/Demo Attack pattern (Blocs 69/70): title
// above the buttons, targeting 50% of the row. Mobile (Bloc 69/G, tested
// above) is untouched.
describe("Bloc 71/B: Classement desktop league field joins the 50%-width pattern", () => {
  // Review fix (PR #90) made this shrinkable (flex: 0 1 50%; min-width: 0)
  // to avoid overflowing at desktop widths just above 900px — but that let
  // the field silently shrink to as little as 38% there, which Bloc 73/C
  // (tested separately below) fixes by pinning back to a non-shrinking 50%
  // and instead letting .ranking-fields itself wrap. See the Bloc 73/C
  // describe block for the current rule.

  it("no longer carries .ranking-inline-field's desktop inline-label rule (title is above, not inline before)", () => {
    // .ranking-inline-field itself must still exist for the 2 numeric
    // fields (Bloc 64/G, tested in Bloc 69/G above) — only the league
    // field's own rule declares the 50% width independently.
    const leagueRule = css.match(/\.ranking-league-field\s*{([\s\S]*?)\n}/)?.[1];
    expect(leagueRule).toBeDefined();
    expect(leagueRule).not.toMatch(/display: flex;/);
  });

  // 2nd review fix (PR #90): the field shrinking alone let its
  // .family-buttons fall back to its own generic overflow-x: auto and
  // scroll internally — which the permanent Bloc 69/F e2e regression test
  // forbids (no league group may ever scroll, at any width; this exact
  // case failed CI at 1000px). Wraps to a 2nd row instead: no scroll in
  // either axis, full button text always visible.
  it("wraps .family-buttons instead of letting it scroll, so the row-F 'never scrolls' invariant holds even when the field is squeezed", () => {
    expect(css).toMatch(
      /\.ranking-league-field \.family-buttons\s*{\s*\n\s*flex-wrap: wrap;\s*\n\s*overflow-x: visible;/,
    );
  });
});

// Bloc 69/E: City's 3 tools (Coût de Ville/Niveau Max Atteignable/
// Production) and Demo Attack Troops' league field now shares the row
// with the tool's other fields on desktop (a dedicated flex row,
// .calculator-fields-inline, not the generic .calculator-fields grid
// still used by Gems/results/admin), instead of being isolated on its
// own full-width row (superseding the Bloc 68/J+K fix). Single line,
// equal-width buttons — same pattern as Ranking's own dedicated
// .ranking-fields (Bloc 61/B) — instead of wrapping and stretching the
// row taller than its sibling fields need.
describe("Bloc 69/E: City tools + Demo Attack Troops league field shares the row", () => {
  it("lays out .calculator-fields-inline as a single nowrap row on desktop, stacked on mobile", () => {
    const rule = css.match(/\.calculator-fields-inline\s*{([\s\S]*?)\n}/)?.[1];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/display: flex;/);
    expect(rule).toMatch(/flex-wrap: nowrap;/);
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.calculator-fields-inline\s*{([\s\S]*?)\n\s*}/,
    )?.[1];
    expect(mediaBlock).toBeDefined();
    expect(mediaBlock).toMatch(/flex-direction: column;/);
  });

  it("gives the league field's buttons first claim on the row, sharing it instead of scrolling or being isolated on their own line", () => {
    expect(css).toMatch(
      /\.calculator-fields-inline \.calculator-field:not\(\.calculator-league-field\)\s*{\s*\n\s*flex: 1 1 0;\s*\n\s*min-width: 6rem;/,
    );
    // min-width: max-content (not 0) is the point — flex-basis: 0 alone
    // would let a button shrink past its own label, truncating it.
    expect(css).toMatch(
      /\.calculator-fields-inline \.family-buttons button\s*{\s*\n\s*flex: 1 1 0;\s*\n\s*min-width: max-content;/,
    );
  });
});

// Bloc 70/A: the league field's own width is now fixed at exactly 50% of
// the shared row (flex: 0 0 50%, no grow/shrink), instead of a flex-grow
// ratio that shifted with how many numeric fields shared the row (40% for
// City Cost's 3 fields, 50% for Niveau Max/Production's 2, 66% for Demo
// Attack's 1) — flat 50% across all 4 tools. Scoped to
// .calculator-fields-inline only: Player Settings, Ranking mobile, and
// Level Up/Progression/Events keep their own separate width decisions.
describe("Bloc 70/A: league field is exactly 50% of the shared row", () => {
  it("fixes .calculator-league-field at flex: 0 0 50%, not a grow-based ratio", () => {
    expect(css).toMatch(
      /\.calculator-fields-inline \.calculator-league-field\s*{\s*\n\s*flex: 0 0 50%;/,
    );
  });

  // Bloc 71/B reversed the Bloc 69 exclusion for Classement's desktop
  // league field specifically — it now also targets 50% (Bloc 73/C:
  // back to a non-shrinking flex: 0 0 50%, tested in the Bloc 73/C block
  // below — PR #90's shrinkable flex: 0 1 50% let it silently shrink well
  // below 50% at desktop widths just above 900px). Player Settings (its
  // own 5fr/2fr/3fr grid split, Bloc 71/D) and Level Up/Progression/Events
  // still keep their own separate width decisions, untouched.
  it("does not touch the width of Player Settings' or Level Up/Progression/Events' league selectors", () => {
    expect(css).not.toMatch(/\.settings-grid[\w-]*\s*{\s*\n\s*flex: 0 0 50%;/);
    // Bloc 73/C added a 2nd site-wide occurrence: .ranking-league-field.
    expect(css.match(/flex: 0 0 50%;/g)?.length).toBe(2);
  });
});

// Bloc 71/A: Niveau Max Atteignable only — Nombre de villes and Niveau de
// départ narrowed 30%, freeing space for the Or disponible numeric field
// (not its own unit selector, which is separately narrowed 30% too).
describe("Bloc 71/A: Niveau Max Atteignable field widths", () => {
  it("narrows Nombre de villes/Niveau de départ by 30% (flex-grow 0.7 vs the row's default 1)", () => {
    expect(css).toMatch(
      /\.city-maxlevel-fields \.calculator-field\.city-maxlevel-narrow-field\s*{\s*\n\s*flex: 0\.7 1 0;/,
    );
  });

  it("hands the freed space (0.3 + 0.3) to the Or disponible field as a whole", () => {
    expect(css).toMatch(
      /\.city-maxlevel-fields \.calculator-field\.city-maxlevel-gold-field\s*{\s*\n\s*flex: 1\.6 1 0;/,
    );
  });

  it("narrows the gold unit select by 30% (4.5rem -> 3.15rem), so the NumberStepper column absorbs it", () => {
    expect(css).toMatch(
      /\.city-maxlevel-gold-field \.unit-input\s*{\s*\n\s*grid-template-columns: minmax\(0, 1fr\) 3\.15rem;/,
    );
  });
});

// Bloc 71/C: league buttons must never render bold, on any of the site's
// league-button locations — aligned on Player Settings' own (correct)
// style, which was never bold because its label is a sibling <span>
// rather than a shared bold ancestor.
describe("Bloc 71/C: league button text is never bold", () => {
  it("pins .family-buttons button/a to font-weight: 400, overriding any inherited bold ancestor", () => {
    expect(css).toMatch(
      /\.family-buttons button,\s*\n\.family-buttons a\s*{\s*\n\s*font-weight: 400;/,
    );
  });

  it("does not change .pagination button's own weight (same base rule, but a different concern)", () => {
    const rule = css.match(
      /\.family-buttons button,\s*\n\.family-buttons a\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/\.pagination/);
  });
});

// Bloc 71/D: League/Level/VP now share one row on desktop, replacing Bloc
// 68's "25% each for Level/VP" (which didn't put League on that row at
// all) — a 50/20/20/10 split (League/Level/VP-number/VP-unit).
describe("Bloc 71/D: Player Settings League/Level/VP share one row (50/20/20/10)", () => {
  it("splits the desktop row 5:2:3 (League 50%, Level 20%, VP-as-a-whole 30%)", () => {
    expect(css).toMatch(
      /\.settings-grid-primary\s*{\s*\n\s*grid-template-columns: 5fr 2fr 3fr;/,
    );
  });

  it("splits VP's own unit-input 2:1, landing its NumberStepper at 20% of the row and the unit select at 10%", () => {
    expect(css).toMatch(
      /\.settings-grid-primary \.unit-input\s*{\s*\n\s*grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\);/,
    );
  });

  it("keeps the mobile layout (Blocs 68/H+I, 69/D) completely unchanged", () => {
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {([\s\S]*?)\n}\n(?!@media)/,
    )?.[0];
    expect(mediaBlock).toMatch(
      /\.settings-grid-primary > :first-child\s*{\s*\n\s*grid-column: 1 \/ -1;/,
    );
    expect(mediaBlock).toMatch(
      /\.settings-grid-primary\s*{\s*\n\s*grid-template-columns: minmax\(0, 4\.5fr\) minmax\(0, 7\.5fr\);/,
    );
    expect(mediaBlock).toMatch(
      /\.settings-grid-primary \.unit-input\s*{\s*\n\s*grid-template-columns: minmax\(0, 1fr\) 3\.1rem;/,
    );
  });
});

// Bloc 72/A: the Combat equipment simulator's "Gemme X" label moves above
// its 3 selects on mobile, instead of sharing the row with them, freeing
// the full row width for Compétence/Étoiles/Ligue. Desktop is untouched.
describe("Bloc 72/A: gem row label moves above its 3 selects, mobile only", () => {
  it("switches the row to a 3-equal-column grid and spans the label across all of them, inside a max-width: 900px query", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.stuff-gem-row\s*{\s*\n\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);\s*\n\s*}\s*\n\s*\.stuff-gem-row-label\s*{\s*\n\s*grid-column: 1 \/ -1;\s*\n\s*}\s*\n}/,
    );
  });
});

// Bloc 72/B: Gems' Optimisation mode's 4 family buttons stay on one
// full-width line on mobile instead of the generic .family-buttons wrap.
describe("Bloc 72/B: Gems Optimization family buttons stay full width on one mobile line", () => {
  it("makes the 4 buttons grow equally without shrinking below their own label", () => {
    expect(css).toMatch(
      /\.gem-optimize-family-buttons button\s*{\s*\n\s*flex: 1 1 0;\s*\n\s*min-width: max-content;/,
    );
  });
});

// Bloc 72/C: the Combat equipment simulator's skill-filter buttons go full
// width on one mobile line, and the "Transférer en Paramètres joueur"
// button — no longer meaningfully right-aligned once everything is full
// width — moves to its own full-width 2nd line.
describe("Bloc 72/C: Combat equipment simulator's skill buttons + transfer button, mobile", () => {
  it("makes the skill buttons grow equally without shrinking below their own label", () => {
    expect(css).toMatch(
      /\.stuff-family-buttons button:not\(\.transfer-action\)\s*{\s*\n\s*flex: 1 1 0;\s*\n\s*min-width: max-content;/,
    );
  });

  it("forces the transfer button onto its own full-width 2nd line", () => {
    expect(css).toMatch(
      /\.stuff-family-buttons \.transfer-action\s*{\s*\n\s*flex: 1 1 100%;\s*\n\s*margin-left: 0;/,
    );
  });
});

// Bloc 72/D: the Expedition equipment simulator's 5 family filters split
// 3+2 across 2 full-width mobile rows (Personnalisé/Or/Équipement, then
// Consommables/Troupes), using the same 6-column-track technique as
// Bloc 68/M's rarity filter.
describe("Bloc 72/D: Expedition equipment simulator's 5 family filters, 3+2 mobile grid", () => {
  it("lays the row out as a 6-column track, inside a max-width: 900px query", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\) {\s*\n\s*\.expedition-sim-family-buttons\s*{\s*\n\s*display: grid;\s*\n\s*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\);/,
    );
  });

  it("spans the first 3 buttons over 2 columns each (row 1) and the last 2 over 3 columns each (row 2)", () => {
    expect(css).toMatch(
      /\.expedition-sim-family-buttons button:nth-child\(1\),\s*\n\s*\.expedition-sim-family-buttons button:nth-child\(2\),\s*\n\s*\.expedition-sim-family-buttons button:nth-child\(3\)\s*{\s*\n\s*grid-column: span 2;/,
    );
    expect(css).toMatch(
      /\.expedition-sim-family-buttons button:nth-child\(4\),\s*\n\s*\.expedition-sim-family-buttons button:nth-child\(5\)\s*{\s*\n\s*grid-column: span 3;/,
    );
  });

  it("lets a button's own label wrap instead of overflowing its narrower grid column (long labels like 'Équipement combat')", () => {
    expect(css).toMatch(
      /\.expedition-sim-family-buttons button\s*{\s*\n\s*min-width: 0;\s*\n\s*white-space: normal;\s*\n\s*text-align: center;/,
    );
  });
});

// Bloc 73/A+C: the Bloc 71 50% column/field was mathematically correct but
// the league buttons themselves never grew to fill it (flex: 0 0 auto),
// leaving a large dead gap after the last button — both fixed with the
// same no-truncation equal-width technique as Bloc 69/E.
describe("Bloc 73/A: Player Settings league buttons fill their 50% column", () => {
  it("grows each button to share the column, without shrinking below its own label", () => {
    expect(css).toMatch(
      /\.settings-grid-league-field \.family-buttons button\s*{\s*\n\s*flex: 1 1 0;\s*\n\s*min-width: max-content;/,
    );
  });
});

describe("Bloc 73/B: Niveau/VP fields match the panel's other field heights", () => {
  it("stops .settings-grid label's own grid from stretching its rows to the row's full height (the League field's taller title+buttons stack was forcing Niveau/VP's stepper row taller too)", () => {
    expect(css).toMatch(
      /\.settings-grid label\s*{\s*\n\s*display: grid;\s*\n\s*align-content: start;/,
    );
  });
});

describe("Bloc 73/C: Classement league buttons genuinely hold 50%, at every desktop width", () => {
  it("fills the league buttons to their column, same as Bloc 73/A", () => {
    expect(css).toMatch(
      /\.ranking-league-field \.family-buttons button\s*{\s*\n\s*flex: 1 1 0;\s*\n\s*min-width: max-content;/,
    );
  });

  it("pins the field back to a non-shrinking 50% (Bloc 71/B's flex: 0 1 50%; min-width: 0 review fix is reverted)", () => {
    expect(css).toMatch(
      /\.ranking-league-field\s*{\s*\n\s*flex: 0 0 50%;\s*\n}/,
    );
  });

  it("lets .ranking-fields itself wrap so a numeric field moves to a 2nd line instead of league ever shrinking", () => {
    expect(css).toMatch(
      /\.ranking-fields\s*{\s*\n\s*display: flex;[\s\S]*?\n\s*flex-wrap: wrap;/,
    );
  });
});

// Bloc 73/D: replaces Bloc 32/D.1's single stacked column (image, star
// text, then a row of gem badges) with image+star on the left and the
// gems stacked in their own column on the right, using real star icons
// (never "N★"/"N*" text) for both the equipment and each gem.
describe("Bloc 73/D: Combat equipment slot cell — image+star left, gems column right", () => {
  it("lays the slot's body out as a row: left column (image+star), right column (stacked gems)", () => {
    expect(css).toMatch(
      /\.stuff-slot-layout\s*{\s*\n\s*display: flex;/,
    );
    expect(css).toMatch(/\.stuff-slot-left\s*{\s*\n\s*display: flex;\s*\n\s*flex-direction: column;/);
    expect(css).toMatch(
      /\.stuff-slot-gems\s*{\s*\n\s*display: flex;\s*\n\s*flex-direction: column;/,
    );
  });

  it("defines the shared star-rating rendering (converts fully to a distinct yellow past level 4)", () => {
    expect(css).toMatch(
      /\.star-rating svg\s*{\s*\n\s*fill: currentColor;/,
    );
    // Bloc 74/B replaced the var(--amber-bright) reference — see that
    // block below for the current (fixed-value) rule.
    expect(css).toMatch(/\.star-rating-yellow\s*{\s*\n\s*color: #a8710a;/);
  });

  // Review fix: var(--border) is a light, near-white grey in the light
  // theme, so a white-filled star had almost no visible outline against
  // the equally near-white tile background there. A fixed, theme-
  // independent dark outline stays legible on both a light and dark
  // surface.
  it("gives the white-tier star icons a fixed dark outline, not the theme-dependent --border token", () => {
    expect(css).toMatch(
      /\.star-rating svg\s*{\s*\n\s*fill: currentColor;\s*\n\s*stroke: rgb\(0 0 0 \/ 55%\);/,
    );
  });

  // Review fix: the worst case (2.8rem image + a 3-gem column, each gem
  // at its max 8-star/4-icon tier) overflowed the ~95px mobile cell —
  // shrink the image, gaps and icon sizes back down below the 900px
  // breakpoint so it always fits. Desktop (Bloc 73/E) is untouched.
  it("shrinks the combat image, gaps, and icon sizes back down on mobile so the worst case (max stars on all 3 gems) still fits", () => {
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.stuff-slot-image-combat\s*{([\s\S]*?)\n}\n(?!@media)/,
    )?.[0];
    expect(mediaBlock).toBeDefined();
    expect(mediaBlock).toMatch(/max-height: 1\.6rem;/);
    expect(mediaBlock).toMatch(/\.star-rating svg\s*{\s*\n\s*width: 6px;\s*\n\s*height: 6px;/);
  });

  // Bloc 78/B: Expedition gets its own mobile floor for the new
  // .stuff-slot-image-expedition class, alongside Combat's.
  it("also shrinks Expedition's own image class on mobile, back down to the same 1.6rem floor", () => {
    const mediaBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.stuff-slot-image-combat\s*{([\s\S]*?)\n}\n(?!@media)/,
    )?.[0];
    expect(mediaBlock).toBeDefined();
    expect(mediaBlock).toMatch(
      /\.stuff-slot-image-expedition\s*{\s*\n\s*max-height: 1\.6rem;/,
    );
  });
});

describe("Bloc 73/E, 78/A: Combat equipment slot image size", () => {
  it("keeps the shared .stuff-slot-image (also used by Expedition) at the original 1.8rem", () => {
    expect(css).toMatch(
      /\.stuff-slot-image\s*{\s*\n\s*max-width: 100%;\s*\n\s*max-height: 1\.8rem;/,
    );
  });

  // Review fix: .stuff-slot-image is shared with the Expedition slot
  // renderer, which (until Bloc 78/B) had no extra room for a bigger
  // image — the increase is scoped to a 2nd, Combat-only class instead
  // of the shared one. Bloc 78/A: 2.8rem -> 3.2rem.
  it("raises the size only for Combat, via a 2nd class alongside the shared one", () => {
    expect(css).toMatch(
      /\.stuff-slot-image-combat\s*{\s*\n\s*max-height: 3\.2rem;\s*\n}/,
    );
  });

  // Bloc 78/B: Expedition now gets the same enlargement, via its OWN 2nd
  // class rather than reusing the Combat-named one on Expedition markup.
  it("gives Expedition the same 3.2rem size, via its own dedicated class, not a reuse of the Combat one", () => {
    expect(css).toMatch(
      /\.stuff-slot-image-expedition\s*{\s*\n\s*max-height: 3\.2rem;\s*\n}/,
    );
  });
});

// Bloc 74/A: the Bloc 73/D review fix (a literal #fff fill) still read as
// near-invisible in the light theme — a fixed light color can never work
// in both themes. Switching to var(--foreground) resolves per-theme like
// the rest of the page's text (off-white in dark, dark grey/near-black in
// light), instead of a same-hue lightness tweak (the Bloc 22/24 lesson:
// that kind of fix isn't reliable — a real per-theme value is).
describe("Bloc 74/A, 78/C: white-tier stars use a dedicated --star-white token, not a fixed #fff or the shared --foreground", () => {
  it("resolves the base star color via --star-white instead of a literal white or the shared --foreground", () => {
    expect(css).toMatch(
      /\.star-rating\s*{\s*\n\s*display: inline-flex;\s*\n\s*gap: 1px;\s*\n\s*color: var\(--star-white\);/,
    );
  });

  it("leaves the yellow tier's own color rule completely separate (tested in Bloc 74/B below), so this fix never touches 5-8★", () => {
    const baseRule = css.match(/\.star-rating\s*{([\s\S]*?)\n}/)?.[0];
    expect(baseRule).toBeDefined();
    expect(baseRule).not.toMatch(/amber/);
  });

  // Bloc 78/C: --foreground's light-theme value (#20242b) read as
  // near-black for the small filled star icons specifically, even though
  // it's the exact value every other light-theme label already uses —
  // --star-white gets its own, genuinely lighter value in light theme
  // (reusing the existing --text-dim token) without touching --foreground
  // itself, which every other label still depends on.
  it("points --star-white at --foreground in dark theme (unchanged, already fine) and at --text-dim in light theme (lighter, not near-black)", () => {
    const darkBlock = css.match(
      /:root,\s*\n:root\[data-theme="dark"\] {([\s\S]*?)\n}/,
    )?.[0];
    expect(darkBlock).toBeDefined();
    expect(darkBlock).toMatch(/--star-white: var\(--foreground\);/);

    const lightBlock = css.match(
      /:root\[data-theme="light"\] {([\s\S]*?)\n}/,
    )?.[0];
    expect(lightBlock).toBeDefined();
    expect(lightBlock).toMatch(/--star-white: var\(--text-dim\);/);
    // Never the same literal --foreground reference light theme used
    // before — that's the exact regression this fix undoes.
    expect(lightBlock).not.toMatch(/--star-white: var\(--foreground\);/);
  });
});

// Bloc 74/B: .star-rating-yellow used to reference var(--amber-bright),
// a token that (correctly, for its other uses) resolves to a different,
// darker/more-saturated value in the light theme — so the "5-8★" yellow
// silently shifted color across themes instead of staying the fixed tier
// color it's meant to be. Now a literal, non-variable value.
// Review fix: the first literal chosen (#e8a94f, dark theme's old
// --amber-bright verbatim) only reached ~1.83:1 contrast against the
// light theme's --surface, under the WCAG 1.4.11 non-text 3:1 floor.
// #a8710a is a mid-luminance gold that clears 3:1 against both theme
// surfaces (~3.54:1 dark, ~3.72:1 light).
describe("Bloc 74/B: yellow-tier stars use a fixed literal color, never a theme variable", () => {
  it("sets .star-rating-yellow to a literal hex value, not any var(...)", () => {
    const rule = css.match(/\.star-rating-yellow\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/var\(/);
    expect(rule).toMatch(/color: #a8710a;/);
  });
});

describe("Bloc 79/A: Expedition's slot star reuses .stuff-slot-left (Combat's own centered image+star column)", () => {
  it("centers .stuff-slot-left's children — align-items: center on a column flex, not just Combat's own default alignment", () => {
    const rule = css.match(/\.stuff-slot-left\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/display: flex;/);
    expect(rule).toMatch(/flex-direction: column;/);
    expect(rule).toMatch(/align-items: center;/);
  });
});

describe("Bloc 79/C, 80/D: Événements admin Description field is 3x a plain field's width, then +50% more", () => {
  it("sets .events-admin-description-field input to 40.5rem — 27rem (Bloc 79/C's 3x) x 1.5 (Bloc 80/D, cumulative)", () => {
    const rule = css.match(
      /\.events-admin-description-field input\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 40\.5rem;/);
  });

  // Bloc 80/C review: shares the row's own 1400px breakpoint (not the
  // generic 900px), since the fixed 40.5rem only makes sense once the
  // row itself has stopped being single-column.
  it("falls back to filling its row's width below 1400px instead of the fixed 40.5rem", () => {
    const mobileBlock = css.match(
      /@media \(max-width: 1400px\) {[\s\S]*?\.events-admin-description-field input[\s\S]*?\n\s*}\n}/,
    )?.[0];
    expect(mobileBlock).toBeDefined();
    expect(mobileBlock).toMatch(/width: 100%;/);
  });
});

describe("Bloc 80/C: Événements admin event row is a real grid, aligned across every card", () => {
  it("lays the header out as a 6-column grid (position, name, description, duration, color, actions), not a wrapping flex row", () => {
    const rule = css.match(/\.events-admin-card-header\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/display: grid;/);
    expect(rule).toMatch(/grid-template-columns: repeat\(6, auto\);/);
  });

  it("gives Nom a fixed width too, same width-per-column requirement the grid above needs to actually line up", () => {
    const rule = css.match(/\.events-admin-name-field input\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 14rem;/);
  });

  // Bloc 80/C review (Codex PR #97): the 6 fixed columns (14rem name +
  // 40.5rem description alone, before position/duration/color/actions and
  // 5 gaps) need ~1350px of real content width — the generic 900px
  // breakpoint every other admin field uses left a wide band of common
  // desktop/laptop viewports (1024–1366px) neither wrapped nor stacked,
  // just silently overflowing. This row gets its own wider breakpoint.
  it("stacks to a single column well before the row's own ~1350px content width, not the generic 900px breakpoint", () => {
    const mobileBlock = css.match(
      /@media \(max-width: 1400px\) {\s*\n\s*\.events-admin-card-header\s*{([\s\S]*?)\n\s*}/,
    )?.[0];
    expect(mobileBlock).toBeDefined();
    expect(mobileBlock).toMatch(/grid-template-columns: 1fr;/);
  });
});

describe("Bloc 81/C: Événements admin alignment fixes", () => {
  it("C1: shrinks the season-duration field to 10rem (1/4 of its pre-fix ~40rem), filling the row on mobile", () => {
    const rule = css.match(
      /\.events-season-duration-field input\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 10rem;/);
    const mobileBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.events-season-duration-field input\s*{([\s\S]*?)\n\s*}/,
    )?.[0];
    expect(mobileBlock).toBeDefined();
    expect(mobileBlock).toMatch(/width: 100%;/);
  });

  it("C2, C3: top-aligns the header grid (not bottom) so every column's title lines up, regardless of its control's height", () => {
    const rule = css.match(/\.events-admin-card-header\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/align-items: start;/);
    expect(rule).not.toMatch(/align-items: end;/);
  });

  it("C2: compensates the position badge — which has no title row of its own — so it still lands centered on the Nom input, not the title", () => {
    const rule = css.match(/\.events-admin-position\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/align-self: start;/);
    expect(rule).toMatch(/margin-top: 2\.1rem;/);
  });

  // Codex review (PR #98): the 2.1rem offset only makes sense in the
  // 6-column desktop grid, aligning the position badge with the Nom
  // input instead of its title — once the row stacks to 1 column below
  // 1400px, there's no title row above the position badge to offset
  // against any more, so the same offset just left a dead gap above it.
  it("C2 review: resets the position badge's offset to 0 once the row stacks to 1 column", () => {
    const mobileBlock = css.match(
      /@media \(max-width: 1400px\) {\s*\n\s*\.events-admin-position\s*{([\s\S]*?)\n\s*}/,
    )?.[0];
    expect(mobileBlock).toBeDefined();
    expect(mobileBlock).toMatch(/margin-top: 0;/);
  });
});

describe("Bloc 80/E: Récompense (tier level) is 3x the base field width, Objectif untouched", () => {
  it("sets .events-tiers-table .reference-admin-wide input to 27rem", () => {
    const rule = css.match(
      /\.events-tiers-table \.reference-admin-wide input\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: 27rem;/);
  });

  it("falls back to filling its row's width on mobile", () => {
    const mobileBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.events-tiers-table \.reference-admin-wide input\s*{([\s\S]*?)\n\s*}/,
    )?.[0];
    expect(mobileBlock).toBeDefined();
    expect(mobileBlock).toMatch(/width: 100%;/);
  });
});

describe("Bloc 80/F: the manual color picker's toggle + popup swatch grid", () => {
  it("styles the toggle as a round swatch button and the popup as a floating grid of round options", () => {
    const toggle = css.match(/\.events-color-picker-toggle\s*{([\s\S]*?)\n}/)?.[0];
    expect(toggle).toBeDefined();
    expect(toggle).toMatch(/border-radius: 999px;/);

    const options = css.match(/\.events-color-picker-options\s*{([\s\S]*?)\n}/)?.[0];
    expect(options).toBeDefined();
    expect(options).toMatch(/position: absolute;/);

    const option = css.match(/\.events-color-picker-option\s*{([\s\S]*?)\n}/)?.[0];
    expect(option).toBeDefined();
    expect(option).toMatch(/border-radius: 999px;/);
  });

  it("marks the currently-selected swatch with a visible border", () => {
    const rule = css.match(
      /\.events-color-picker-option\[aria-pressed="true"\]\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/border-color: var\(--foreground\);/);
  });
});

describe("Bloc 79/E: the timeline's event name is never ellipsized/clipped, whatever its segment width", () => {
  it("removes the old single-line ellipsis truncation from .events-timeline-name, lets it wrap instead", () => {
    const rule = css.match(/\.events-timeline-name\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/text-overflow: ellipsis/);
    expect(rule).not.toMatch(/white-space: nowrap/);
    expect(rule).toMatch(/overflow-wrap: break-word;/);
  });

  // Bloc 80/G: the flat 9rem cap is gone — max-width is now set inline
  // per segment (events-reference.tsx, timelineLabelMaxWidthRem), so
  // .events-timeline-label itself no longer declares one.
  it("no longer hardcodes a flat max-width on .events-timeline-label — it's set inline per segment instead (Bloc 80/G)", () => {
    const rule = css.match(/\.events-timeline-label\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/max-width:/);
  });

  // Bloc 80/G review: width: auto (the default) shrank the box to its
  // own min-content — the width of its single longest WORD — instead of
  // trying to fit the whole name on 1 line first, so a name still wrapped
  // onto several narrow lines even with plenty of room under the inline
  // max-width. width: max-content fixes that: it prefers the unwrapped
  // width up to that cap, only wrapping once the name genuinely overflows.
  it("sizes .events-timeline-label to its content's preferred width (max-content), not the browser's min-content default", () => {
    const rule = css.match(/\.events-timeline-label\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/width: max-content;/);
  });
});

describe("Bloc 80/G: the timeline name's hard 2-line cap, the fallback once the adaptive box still isn't enough", () => {
  it("clamps .events-timeline-name to 2 lines, never more", () => {
    const rule = css.match(/\.events-timeline-name\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/-webkit-line-clamp: 2;/);
    expect(rule).toMatch(/overflow: hidden;/);
  });
});

describe("Bloc 79/D: a fine 24h-tick day scale under the timeline's segments", () => {
  it("defines the scale row and its tick/label parts", () => {
    expect(css).toMatch(/\.events-timeline-scale\s*{/);
    expect(css).toMatch(/\.events-timeline-tick-group\s*{/);
    expect(css).toMatch(/\.events-timeline-tick\s*{/);
    expect(css).toMatch(/\.events-timeline-tick-label\s*{/);
  });

  it("gives the timeline container extra height to fit the new scale row without overlapping the segment labels", () => {
    const rule = css.match(/\.events-timeline\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/height: 7rem;/);
  });
});

describe("Bloc 79/I: Événements public tiles — grey grid, no image, matching Boutique's own tile treatment", () => {
  it("lays out a 2-per-row grid, 1 on mobile — same breakpoint/columns as .consumable-tile-grid", () => {
    const rule = css.match(/\.events-tile-grid\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    const mobileBlock = css.match(
      /@media \(max-width: 900px\) {\s*\n\s*\.events-tile-grid\s*{([\s\S]*?)\n\s*}/,
    )?.[0];
    expect(mobileBlock).toBeDefined();
    expect(mobileBlock).toMatch(/grid-template-columns: 1fr;/);
  });

  // Bloc 79 review (Codex PR #96): the grid's default align-items (stretch)
  // stretches every cell in a row to match its tallest sibling — an
  // expanded (taller) tile was visually stretching a still-closed
  // row-neighbor into a large empty bordered panel.
  it("aligns grid items to the start, so an expanded tile never stretches a closed row-neighbor to match its height", () => {
    const rule = css.match(/\.events-tile-grid\s*{([\s\S]*?)\n}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toMatch(/align-items: start;/);
  });

  it("gives the tile the same grey .consumable-tile-style surface, and the heading a desktop-row/mobile-column badge group", () => {
    const tileRule = css.match(/\.events-tile\s*{([\s\S]*?)\n}/)?.[0];
    expect(tileRule).toBeDefined();
    expect(tileRule).toMatch(/background: var\(--surface-muted\);/);

    const headingRule = css.match(/\.events-tile-heading\s*{([\s\S]*?)\n}/)?.[0];
    expect(headingRule).toBeDefined();
    expect(headingRule).toMatch(/justify-content: space-between;/);

    const mobileHeading = css.match(
      /@media \(max-width: 900px\) {[\s\S]*?\.events-tile-heading\s*{([\s\S]*?)\n\s*}/,
    )?.[0];
    expect(mobileHeading).toBeDefined();
    expect(mobileHeading).toMatch(/flex-direction: column;/);
  });

  it("styles the 2 badges distinctly (objective in emerald, duration in the accent), never coloring the tile itself by event name", () => {
    const objectiveBadge = css.match(
      /\.events-tile-badge-objective\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(objectiveBadge).toBeDefined();
    // --gold is reserved for legendary-rarity data only, never a generic
    // UI color (color-palette.test.ts) — this badge must never use it.
    expect(objectiveBadge).not.toMatch(/var\(--gold(-bright)?\)/);
    expect(objectiveBadge).toMatch(/var\(--emerald-bright\)/);

    const durationBadge = css.match(
      /\.events-tile-badge-duration\s*{([\s\S]*?)\n}/,
    )?.[0];
    expect(durationBadge).toBeDefined();
    expect(durationBadge).toMatch(/var\(--accent-strong\)/);
  });
});
