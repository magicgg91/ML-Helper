import { expect, test } from "@playwright/test";
import de from "../messages/de.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

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
  // A tool page carries both its WebApplication and (Bloc 91/M4) its
  // BreadcrumbList. Bloc 94 removed the visible trail; this structured data
  // is deliberately kept.
  expect(ld.some((t) => t.includes("WebApplication"))).toBe(true);
  expect(ld.some((t) => t.includes("BreadcrumbList"))).toBe(true);
});

// Bloc 94: the visible breadcrumb is gone from every page that carried it —
// it restated what the page already showed. Its BreadcrumbList structured
// data stays: invisible to the reader, and used by search engines to render
// the trail in results. Both halves are asserted together on the same three
// page types, so removing one can never silently take the other with it.
test("Bloc 94: no visible breadcrumb, but the BreadcrumbList stays", async ({
  page,
}) => {
  // `marker` locates the page's OWN visible "you are here" indicator, which
  // differs by page type: a tool page's <h1> is sr-only, so its indicator is
  // the current category tab; référentiels and guides carry a visible <h1>.
  for (const [path, current, marker] of [
    ["/fr/tools/villes", "Villes", '.category-nav [aria-current="page"]'],
    ["/fr/referentiels/gems", "Gemmes", "main h1"],
    ["/fr/guides/guide-visible", "Guide visible", "main h1"],
  ]) {
    await page.goto(path);

    // No breadcrumb landmark, no breadcrumb container, and no "Accueil" crumb
    // link anywhere on the page.
    await expect(
      page.getByRole("navigation", { name: /Ariane|Breadcrumb/ }),
    ).toHaveCount(0);
    await expect(page.locator(".breadcrumb")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Accueil" })).toHaveCount(0);
    // Not asserted: the "›" separators. They were drawn by a CSS ::before on
    // .breadcrumb li, never present in the DOM, so a "no separators in the
    // text" check passes whether or not the trail is rendered. The .breadcrumb
    // locator above is what actually covers them — the rule is deleted too.

    // The page still says where you are — that is why the trail was redundant.
    // Asserted through that specific marker, not a bare getByText: Codex (PR
    // #119) pointed out that getByText matches a nav label whether or not it
    // is marked as current, so the text-only version would pass even on a
    // page whose indicator had vanished.
    await expect(page.locator(marker)).toBeVisible();
    await expect(page.locator(marker)).toContainText(current);

    // …and the structured data is intact, listing the same trail.
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const breadcrumb = ld.find((text) => text.includes("BreadcrumbList"));
    expect(breadcrumb, `no BreadcrumbList on ${path}`).toBeTruthy();
    const parsed = JSON.parse(breadcrumb!);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement.length).toBeGreaterThanOrEqual(2);
    // Root crumb first, current page last — the order search engines render.
    expect(parsed.itemListElement[0].name).toBe("Accueil");
    expect(parsed.itemListElement.at(-1).name).toBe(current);
  }
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

// Bloc 95 (audit SEO Bloc 91/F1): the PWA manifest and its icons, so a player
// can install ML-Helper on a phone's home screen.
//
// Served at …/manifest.webmanifest, NOT …/manifest.json: that is the media
// type's own extension and the route the <link rel="manifest"> below points
// at. Browsers follow that link — they never guess a filename — so the
// asserted URL is taken from the tag rather than hardcoded, which is also what
// makes this test notice if the route moves.
test("Bloc 95: the manifest is linked, served, and describes an installable app", async ({
  page,
  request,
}) => {
  await page.goto("/fr/tools/villes");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href, "no <link rel=manifest> in the document head").toBeTruthy();
  expect(href).toContain("/manifest.webmanifest");

  const res = await request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("manifest+json");

  const manifest = JSON.parse(await res.text());
  expect(manifest.name).toBe(fr.Public.meta.siteTitle);
  expect(manifest.short_name).toBe("ML-Helper");
  // standalone is what drops the browser address bar once installed.
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.theme_color).toBe("#8b6bb8");
  expect(manifest.background_color).toBe("#1b2029");
  expect(manifest.icons).toHaveLength(2);
});

// Codex review (PR #120): the name in that manifest is what the install prompt
// shows, so it follows the language the visitor is reading — each locale links
// its own manifest instead of all five sharing one French document.
test("Bloc 95: each locale links a manifest naming the app in its own language", async ({
  page,
  request,
}) => {
  const names: string[] = [];
  for (const [locale, messages] of [
    ["en", en],
    ["de", de],
  ] as const) {
    await page.goto(`/${locale}/tools/villes`);
    const href = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(href, `no <link rel=manifest> on the ${locale} page`).toBe(
      `/${locale}/manifest.webmanifest`,
    );

    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    const manifest = JSON.parse(await res.text());
    expect(manifest.name).toBe(messages.Public.meta.siteTitle);
    names.push(manifest.name);
  }
  // The whole point: three locales, three different names in the prompt.
  expect(new Set([...names, fr.Public.meta.siteTitle]).size).toBe(3);
});

test("Bloc 95: both manifest icons are served at the dimensions they declare", async ({
  request,
}) => {
  const res = await request.get("/manifest.webmanifest");
  const { icons } = JSON.parse(await res.text());

  for (const icon of icons) {
    const file = await request.get(icon.src);
    expect(file.status(), `${icon.src} is not served`).toBe(200);
    expect(file.headers()["content-type"]).toContain("image/png");

    // Width and height straight from the PNG IHDR chunk, so this compares the
    // bytes actually served against what the manifest promises rather than
    // trusting the declaration on both sides.
    const bytes = await file.body();
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    expect(`${width}x${height}`, `${icon.src} has the wrong size`).toBe(
      icon.sizes,
    );
  }
});

test("Bloc 95: the Apple touch icon is exposed for iOS home screens", async ({
  page,
}) => {
  await page.goto("/fr/tools/villes");
  // iOS ignores the manifest icons for the home screen and uses this tag,
  // which the src/app/apple-icon.png file convention emits.
  const appleIcon = page.locator('link[rel="apple-touch-icon"]');
  await expect(appleIcon).toHaveCount(1);
  expect(await appleIcon.getAttribute("href")).toContain("/apple-icon.png");
});
