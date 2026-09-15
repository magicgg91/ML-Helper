import { expect, test } from "@playwright/test";
import { themeBackground, type Theme } from "../src/lib/theme-color";
import { bandColours, decodePngPixels } from "../src/test/png-pixels";

// Bloc 105: the top edge of the page has to resolve to ONE flat colour.
//
// An installed iOS app's status bar sits over that edge, and since Safari 26
// WebKit fills the strip with a frosted-glass band whenever it cannot read a
// solid colour there — blurring the ML-HELPER wordmark and the nav buttons
// underneath. body carried a radial gradient reaching y=0, which measured
// #212431 at the left edge fading to #1b2029 past mid-width, dithered pixel
// by pixel. Bloc 103 gave the strip an explicit theme-color first; on a real
// device the blur survived it, so the gradient was pushed 10rem down the page.
//
// And the flat colour has to be the one Bloc 103 declares in theme-color: a
// strip painted a different shade from the page under it is the same defect
// wearing a different face. Both halves are asserted here against the one
// module that holds those values.
//
// 96px covers the tallest iOS top safe area (59pt on Dynamic Island phones)
// with room to spare, while staying well inside the 10rem (160px) the CSS
// actually clears.
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
        "the status-bar band is not a single flat colour, so iOS will frost it",
      ).toEqual([themeBackground[theme]]);
    });
  }
}
