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
// Bloc 129 : --bg-panel & co sont devenus des alias des jetons du §1.2, donc
// la lecture suit une indirection var(--x) avant de rendre les bras.
const variable = (block: string, name: string): string | undefined => {
  const value = block
    .match(new RegExp(`${name}:\\s*([^;]+);`, "i"))?.[1]
    ?.trim();
  if (!value) return undefined;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const alias = /^var\((--[a-z0-9-]+)\)$/i.exec(value);
  return alias ? variable(block, alias[1]!) : undefined;
};

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

  // Bloc 114/A.1: the Combat sub-tabs wrap 2 per row on a phone as a real
  // grid — flex-wrap packs the three short labels on one line and strands
  // the long one, the same way it did for the Outils category nav.
  it("wraps the Combat sub-tabs two per row on a phone", () => {
    const mobile = css.match(
      /\n  \.city-calculators nav\.calculator-tabs \{([\s\S]*?)\n  \}/,
    )?.[1];
    expect(mobile, "the mobile sub-tab rule").toBeDefined();
    expect(mobile).toMatch(/display: grid;/);
    expect(mobile).toMatch(
      /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
  });

  // Bloc 114/B: the two XP columns are side by side on a desktop and stack on
  // a phone — five tiles in half a phone would wrap every range onto 3 lines.
  it("stacks the two XP columns on a phone", () => {
    expect(css).toMatch(
      /\.xp-columns \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/,
    );
    const mobile = css.match(/\n  \.xp-columns \{([\s\S]*?)\n  \}/)?.[1];
    expect(mobile, "the mobile XP column rule").toBeDefined();
    expect(mobile).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
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

  /**
   * Bloc 133 §B : l'inverse de ce que le Bloc 132 §8 avait posé. Les
   * onglets défilaient horizontalement dans la bande ; à l'usage, une
   * partie des choix restait hors de l'écran, sans rien pour le dire — sur
   * la page d'un référentiel, quatre entrées sur sept. Deux colonnes les
   * montrent toutes.
   */
  it("range les deux bandeaux en deux colonnes sur mobile, sans défilement", () => {
    const narrow = css.slice(
      css.indexOf("@media (max-width: 48rem) {\n  .selection-banner {"),
    );
    expect(narrow).toMatch(
      /\.selection-banner-band {[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    // Ce qui faisait défiler : plus rien n'en reste.
    const band = narrow.slice(
      narrow.indexOf(".selection-banner-band {"),
      narrow.indexOf("}", narrow.indexOf(".selection-banner-band {")),
    );
    for (const dead of [
      "overflow-x",
      "grid-auto-columns",
      "grid-auto-flow",
      "scroll-snap-type",
    ])
      expect(band, dead).not.toContain(dead);
    // La rangée des outils de la catégorie suit la même règle.
    expect(narrow).toMatch(
      /\.calculator-tabs {\n\s*grid-auto-flow: row;\n\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  /**
   * Tous les onglets d'un bandeau ont la même taille, contenu centré. Sans
   * `grid-auto-rows: 1fr`, une rangée dont le libellé passe sur deux lignes
   * est plus haute que les autres — le bandeau des référentiels en a une,
   * et ses sept onglets n'étaient pas de la même taille.
   */
  it("donne la même taille à tous les onglets, contenu centré", () => {
    const narrow = css.slice(
      css.indexOf("@media (max-width: 48rem) {\n  .selection-banner {"),
    );
    expect(narrow).toMatch(
      /\.selection-banner-band {[\s\S]*?grid-auto-rows: 1fr;/,
    );
    // Le centrage de la règle de base survit : rien ne le remplace ici.
    const tab = narrow.slice(
      narrow.indexOf("  .selection-tab {"),
      narrow.indexOf("}", narrow.indexOf("  .selection-tab {")),
    );
    expect(tab).not.toContain("justify-content");
    expect(tab).not.toContain("text-align");
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

  // Bloc 129 : ce test protégeait le repli sur mobile des titres de /tools
  // et /referentiels (Bloc 84) — leur classe forçait nowrap, et la media
  // query le relâchait sous 900 px. Les deux classes ont disparu avec les
  // titres qu'elles habillaient : l'en-tête de page commun (§2) ne force
  // jamais nowrap, donc il n'y a plus rien à relâcher.

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

/**
 * Bloc 132 §6 : l'index Outils.
 *
 * Le §6 ne change que le desktop — « Mobile : disposition inchangée » — et
 * c'est la moitié fragile : la carte mobile d'avant n'existe plus qu'en
 * repli, dans une media query, sous une disposition desktop qui ne lui
 * ressemble pas. Les deux moitiés sont donc tenues ici, ensemble.
 */
describe("Bloc 132 §6 — la page Outils", () => {
  const section = css.match(/\n\.tool-sections {([\s\S]*?)\n}/)?.[1];
  const tools = css.match(/\n\.tool-section-tools {([\s\S]*?)\n}/)?.[1];
  const tile = css.match(/\n\.tool-section-tools a {([\s\S]*?)\n}/)?.[1];
  // Le repli mobile, à partir de son ouverture — les règles qui suivent
  // dans le fichier appartiennent à d'autres sections.
  const narrow = css
    .slice(css.indexOf("@media (max-width: 48rem) {\n  .tool-section-head {"))
    .slice(0, 1400);

  it("empile les catégories, 20 px entre elles", () => {
    expect(section).toMatch(/display: grid;/);
    expect(section).toMatch(/gap: 1\.25rem;/);
    // Pas de grid-template-columns : une carte par rangée, sur toute la
    // largeur. C'est ce qui distingue cette page de l'accueil.
    expect(section).not.toMatch(/grid-template-columns/);
  });

  it("range les outils en quatre colonnes de tuiles larges et basses", () => {
    expect(tools).toMatch(
      /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
    );
    expect(tile).toMatch(/min-height: 5\.625rem/);
    expect(tile).toMatch(/border-radius: var\(--header-control-radius\)/);
    expect(tile).toMatch(/background: var\(--field\)/);
    expect(tile).toMatch(/border: 1px solid var\(--border\)/);
  });

  it("donne à la vignette d'en-tête un carré de 64 px", () => {
    const thumb = css.match(/\n\.tool-section-thumb {([\s\S]*?)\n}/)?.[1];
    expect(thumb).toMatch(/width: 4rem;/);
    expect(thumb).toMatch(/height: 4rem;/);
  });

  // Une description longue grandirait toute la rangée pour une seule tuile.
  it("coupe la description à deux lignes", () => {
    const description = css.match(
      /\n\.tool-entry-description {([\s\S]*?)\n}/,
    )?.[1];
    expect(description).toMatch(/-webkit-line-clamp: 2/);
    expect(description).toMatch(/color: var\(--muted\)/);
  });

  it("rend à mobile la carte d'avant : image pleine largeur, lignes de 48 px, sans description", () => {
    // Pleine largeur, rembourrage de la carte compris — d'où la marge
    // négative qui accompagne la base de 100 %.
    expect(narrow).toMatch(
      /\.tool-section-thumb {[\s\S]*?flex-basis: 100%;[\s\S]*?margin: 0 -1rem;/,
    );
    expect(narrow).toMatch(
      /\.tool-section-tools {[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
    );
    expect(narrow).toMatch(/\.tool-section-tools a {[\s\S]*?min-height: 3rem;/);
    expect(narrow).toMatch(/\.tool-entry-description {\s*\n\s*display: none;/);
  });

  // La grille de l'accueil et les cartes de l'index sont deux mises en page,
  // pas un composant à deux modes : les classes de l'ancienne liste glissée
  // dans la carte d'accueil ne doivent pas survivre sans rendu.
  it("ne garde pas les classes de la liste d'avant", () => {
    expect(css).not.toMatch(/\.tool-category-tools/);
    expect(css).not.toMatch(/\.tool-link-description/);
  });
});
