import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Bloc 91/F4: an automated accessibility net over the representative public
// surfaces — a tool page, an image-heavy reference page and a content list.
// (`/` alone can redirect to the one-time setup during the bootstrap e2e, so
// the always-public routes stand in for it.) WCAG 2 A/AA rule tags.
const pages = [
  "/fr/tools/competences",
  "/fr/referentiels/combat-equipment",
  "/fr/guides",
];

for (const path of pages) {
  test(`Bloc 91/F4: no accessibility violations on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Bloc 91/F4: this net guards the STRUCTURAL rules (accessible names,
      // roles, ARIA, landmarks, labels) — the regressions that slip in
      // unnoticed. color-contrast is excluded on purpose: the reference
      // filters and tiles render the game's own family/rarity color language
      // (e.g. attack red, defense blue), which is below AA by design; changing
      // that palette is a product decision, and the UI chrome's contrast was
      // already handled in Bloc 91/M8.
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
