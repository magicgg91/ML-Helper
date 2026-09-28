import { expect, test } from "@playwright/test";
import { themeBackground, type Theme } from "../src/lib/theme-color";
import { bandColours, decodePngPixels } from "../src/test/png-pixels";

// Bloc 105: the top edge of the page resolves to ONE flat colour, and that
// colour is the one theme-color declares to the browser. A browser tinting its
// UI from theme-color while the page paints something else at its edge shows a
// visible seam, so the two are asserted together, against the one module that
// holds those values (src/lib/theme-color.ts).
//
// Bloc 106 — CORRECTION. This spec was written to guard a fix for an iOS 27
// blur over the status-bar strip. That fix did not work: the blur is an Apple
// system bug hitting every PWA on the device, and nothing in our markup
// reaches it. See src/lib/theme-color.ts for the full record. The spec stays
// because the invariant above holds on its own — but it is no longer guarding
// a known defect, so treat a failure here as a design question, not a bug
// report.
//
// 96px covers the tallest iOS top safe area (59pt on Dynamic Island phones)
// with room to spare, while staying well inside the 10rem (160px) the CSS
// clears.
const bandHeight = 96;

// Two widths because the gradient varied horizontally: a band measured at one
// width says nothing about the other.
const widths = [430, 1280];

for (const theme of ["dark", "light"] as Theme[]) {
  for (const width of widths) {
    test(`Bloc 105: the top ${bandHeight}px are one flat colour — ${theme}, ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (saved) => window.localStorage.setItem("mlhelper_theme", saved),
        theme,
      );
      // /fr/tools rather than the homepage, which redirects to the one-time
      // setup until a Super Admin exists (see seo-metadata.spec.ts).
      await page.goto("/fr/tools");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      // What the page PAINTS at its top edge, which is what WebKit reads —
      // not what happens to sit on top of it. Both themes render header
      // content that reaches y=0, and that content is not the question here.
      await page.addStyleTag({
        content: "body > * { visibility: hidden !important }",
      });

      const shot = await page.screenshot({
        clip: { x: 0, y: 0, width, height: bandHeight },
      });
      const colours = bandColours(decodePngPixels(shot), 0, bandHeight);

      expect(
        colours,
        "the top band is not a single flat colour, so it no longer matches " +
          "the theme-color declared to the browser",
      ).toEqual([themeBackground[theme]]);
    });
  }
}
