import { expect, test } from "@playwright/test";

// Bloc 91/E2–E5: the SEO metadata signals — branded titles, per-page
// descriptions, Open Graph / Twitter cards, the generated OG image and
// robots.txt. Every check here targets public routes other than the homepage
// (which alone redirects to the one-time setup), so this spec is independent
// of the bootstrap flow and needs no admin.

test("robots.txt allows crawling, blocks the private trees, and declares the sitemap", async ({
  request,
}) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("Allow: /");
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /api/");
  expect(body).toContain("Disallow: /login");
  expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

test("the generated Open Graph image route serves a PNG", async ({
  request,
}) => {
  const res = await request.get("/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("a public page carries a branded title, canonical, and an Open Graph / Twitter card", async ({
  page,
}) => {
  await page.goto("/fr/tools");
  // E2: brand + the "Million Lords" keyword on every title via the template.
  await expect(page).toHaveTitle(/ \| ML-Helper · Million Lords$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/fr\/tools$/,
  );
  // E3: exactly one OG image, an OG title, and a large-image Twitter card.
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /^Outils \| ML-Helper/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});

test("each tool category and reference has its own description (no shared template)", async ({
  page,
}) => {
  const descriptionOf = async (path: string) => {
    await page.goto(path);
    return page.locator('meta[name="description"]').getAttribute("content");
  };
  const villes = await descriptionOf("/fr/tools/villes");
  const combat = await descriptionOf("/fr/tools/combat");
  const gems = await descriptionOf("/fr/referentiels/gems");
  const templars = await descriptionOf("/fr/referentiels/templars");
  for (const d of [villes, combat, gems, templars]) expect(d).toBeTruthy();
  // The whole point of E2: these used to share one generic string each.
  expect(new Set([villes, combat, gems, templars]).size).toBe(4);
});

test("Bloc 91/M6: 308-redirects a renamed reference slug to its current URL", async ({
  request,
}) => {
  const res = await request.get("/fr/referentiels/gemmes", {
    maxRedirects: 0,
  });
  expect(res.status()).toBe(308);
  expect(res.headers()["location"]).toMatch(/\/fr\/referentiels\/gems$/);
});

test("Bloc 91/M6: serves a translated 404 with noindex for an unknown URL", async ({
  page,
}) => {
  const res = await page.goto("/fr/page-inexistante");
  expect(res?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("Bloc 91/M4: emits JSON-LD structured data on public pages", async ({
  page,
}) => {
  await page.goto("/fr/tools/villes");
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  // A tool page carries both its WebApplication and (Bloc 91/M7) its
  // BreadcrumbList.
  expect(ld.some((t) => t.includes("WebApplication"))).toBe(true);
  expect(ld.some((t) => t.includes("BreadcrumbList"))).toBe(true);
});

test("Bloc 91/M7: deep pages show a breadcrumb trail", async ({ page }) => {
  await page.goto("/fr/tools/villes");
  const crumb = page.getByRole("navigation", { name: /Ariane|Breadcrumb/ });
  await expect(crumb.getByRole("link", { name: "Accueil" })).toBeVisible();
  await expect(crumb.getByRole("link", { name: "Outils" })).toBeVisible();
  // The current page is the last crumb (not a link).
  await expect(crumb.getByText("Villes")).toBeVisible();
});

test("Bloc 91/M5: reference pages keep a gapless heading hierarchy under one h1", async ({
  page,
}) => {
  const levelsOf = async (path: string) => {
    await page.goto(path);
    return page
      .locator("main :is(h1,h2,h3,h4,h5,h6)")
      .evaluateAll((els) => els.map((el) => Number(el.tagName[1])));
  };
  // gems renders its skill tiles immediately; templars stacks its presentation
  // tiles (once <h3> that skipped a level) above the "Table des coûts" heading.
  for (const path of ["/fr/referentiels/gems", "/fr/referentiels/templars"]) {
    const levels = await levelsOf(path);
    // exactly one top-level heading (the page <h1>)…
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    // …and no heading ever jumps more than one level deeper than the last.
    let previous = 0;
    for (const level of levels) {
      expect(level).toBeLessThanOrEqual(previous + 1);
      previous = level;
    }
  }
});

test("Bloc 91/M5: a guide has a single h1 with the body starting at h2", async ({
  page,
}) => {
  await page.goto("/fr/guides/guide-visible");
  const levels = await page
    .locator("main :is(h1,h2,h3,h4,h5,h6)")
    .evaluateAll((els) => els.map((el) => Number(el.tagName[1])));
  // The page title is the only <h1>; the Markdown body (seeded starting at
  // `##`) sits under it at <h2>, never a second <h1>.
  expect(levels.filter((l) => l === 1)).toHaveLength(1);
  expect(levels[0]).toBe(1);
  expect(levels[1]).toBe(2);
  let previous = 0;
  for (const level of levels) {
    expect(level).toBeLessThanOrEqual(previous + 1);
    previous = level;
  }
});

test("Bloc 91/M7: the footer links to every main section", async ({ page }) => {
  await page.goto("/fr/tools");
  const footer = page.getByRole("contentinfo");
  for (const name of [
    "Outils",
    "Référentiels",
    "Guides",
    "Contact",
    "Mentions légales",
  ]) {
    await expect(footer.getByRole("link", { name })).toBeVisible();
  }
});

test("Bloc 91/F2: an inactive reference still renders but is noindex", async ({
  page,
}) => {
  // Events ships inactive (seeded active:false): it must stay reachable with
  // its "unavailable" state, but not be indexable via a guessed/linked URL.
  const res = await page.goto("/fr/referentiels/events");
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
