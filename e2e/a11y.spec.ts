import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Bloc 91/F4 + Bloc 92/H2: an automated accessibility net over the
// representative public surface — tool pages, image-heavy reference pages in
// tiles, and a content list. WCAG 2 A/AA rule tags.
//
// Bloc 92/H2 note: the color-contrast rule is now ENABLED here (it was
// disabled in Bloc 91/F4). Bloc 92 moved the game's family/rarity/skill hues
// OFF text — onto tile borders, tints and inset rings — and lifted the
// secondary-text tokens, so the reference tiles/pills that used to carry
// hundreds of sub-AA text nodes must stay clean. This locks in the fix rather
// than continuing to mask it.
const pages = [
  "/fr/tools/competences",
  "/fr/referentiels/combat-equipment",
  "/fr/referentiels/shop",
  "/fr/referentiels/gems",
  "/fr/referentiels/templars",
  "/fr/guides",
];

for (const path of pages) {
  test(`Bloc 92/H2: no accessibility violations (contrast included) on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
