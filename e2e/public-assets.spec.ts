import { expect, test } from "@playwright/test";

// Bloc 104: the two tile grids asked the browser for five files that had not
// existed for months — `/category-*.svg`, the placeholder icons both catalogs
// carried before their real illustrations arrived. They were never rendered:
// GameImage only swaps in its fallback after the real image fails. But the
// grids are server components handing that fallback to a client component, so
// React serialised the <img> into the RSC payload and emitted a preload hint
// for it, and the browser fetched all five. Five 404s, and five "preloaded but
// not used" warnings, on every visit.
//
// Checked on /fr/tools and /fr/referentiels rather than the homepage, which
// renders both grids but redirects to the one-time setup until a Super Admin
// exists — the same reason seo-metadata.spec.ts avoids it. These two pages
// cover one grid each, which is where the paths actually live.
for (const path of ["/fr/tools", "/fr/referentiels"]) {
  test(`Bloc 104: ${path} asks for nothing the site does not serve`, async ({
    page,
  }) => {
    const broken: string[] = [];
    const warnings: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400)
        broken.push(`${response.status()} ${response.url()}`);
    });
    page.on("console", (message) => {
      if (
        message.text().includes("was preloaded using link preload but not used")
      ) {
        warnings.push(message.text());
      }
    });

    await page.goto(path, { waitUntil: "networkidle" });
    // The tiles are what this is about, so wait until they are really there.
    await expect(
      page.locator(".tool-category-grid .tool-category-card").first(),
    ).toBeVisible();
    // The warning lands a few seconds after load, not with the response.
    await page.waitForTimeout(3000);

    expect(broken, "requests the site answered with an error").toEqual([]);
    expect(warnings, "resources preloaded and then never used").toEqual([]);
  });
}
