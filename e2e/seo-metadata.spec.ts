import { expect, test } from "@playwright/test";
import de from "../messages/de.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import { parsePngHeader, truecolorPng } from "../src/test/png-header";

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
  // BreadcrumbList. Bloc 94 removed the visible trail and kept this; le
  // Bloc 129 §2.3 rend le visible, et le test ci-dessous vérifie les deux
  // ensemble.
  expect(ld.some((t) => t.includes("WebApplication"))).toBe(true);
  expect(ld.some((t) => t.includes("BreadcrumbList"))).toBe(true);
});

// Bloc 129 §2.3 : le fil d'Ariane visible revient, « sur toutes les pages
// sauf l'accueil ». Le Bloc 94 l'avait retiré au motif qu'il répétait ce que
// la page montrait déjà, en ne gardant que ses données structurées. Les deux
// moitiés sont de nouveau vérifiées ensemble, sur les trois mêmes types de
// page : le visible pour le lecteur, le balisé pour les moteurs — retirer
// l'un ne peut pas emporter l'autre en silence.
test("Bloc 129 §2.3: un fil d'Ariane visible, et sa BreadcrumbList", async ({
  page,
}) => {
  for (const [path, current] of [
    ["/fr/tools/villes", "Villes"],
    ["/fr/referentiels/gems", "Gemmes"],
    ["/fr/guides/guide-visible", "Guide visible"],
  ]) {
    await page.goto(path);

    const trail = page.getByRole("navigation", { name: "Fil d'Ariane" });
    await expect(trail).toBeVisible();
    // Il remonte à l'accueil, et se termine sur la page courante — qui n'est
    // pas un lien, puisqu'on y est déjà.
    await expect(trail.getByRole("link", { name: "Accueil" })).toBeVisible();
    await expect(trail.getByText(current, { exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      trail.getByRole("link", { name: current, exact: true }),
    ).toHaveCount(0);

    // Et les données structurées disent la même chose. Elles se lisent en
    // parcourant les scripts : `hasText` ne voit pas dans un <script>, dont
    // le contenu n'est pas du texte rendu.
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const breadcrumb = JSON.parse(
      scripts.find((text) => text.includes("BreadcrumbList")) ?? "{}",
    ) as { itemListElement?: { name?: string }[] };
    expect(breadcrumb.itemListElement?.at(0)?.name).toBe("Accueil");
    expect(breadcrumb.itemListElement?.at(-1)?.name).toBe(current);
  }
});

// Bloc 129 §2.2 : le pied de page passe d'une rangée de liens à quatre
// colonnes. Ce que le Bloc 91/M7 garantissait tient toujours — chaque section
// du site reste joignable depuis le pied de page — mais par les entrées du
// brief, pas par un lien qui porterait le nom de la section.
test("Bloc 129 §2.2: le pied de page mène à chaque section du site", async ({
  page,
}) => {
  await page.goto("/fr/tools");
  const footer = page.getByRole("contentinfo");
  for (const [name, href] of [
    ["Villes", "/fr/tools/villes"],
    ["Boutique", "/fr/referentiels/shop"],
    ["Tous les référentiels", "/fr/referentiels"],
    ["Tous les guides", "/fr/guides"],
    ["Contact", "/fr/contact"],
    ["Mentions légales", "/fr/legal"],
  ]) {
    await expect(
      footer.getByRole("link", { name, exact: true }),
      `le pied de page ne mène plus à « ${name} »`,
    ).toHaveAttribute("href", href);
  }
  // Et « Signaler une erreur » ouvre Contact sur le bon objet (§2.4).
  await expect(
    footer.getByRole("link", { name: "Signaler une erreur" }),
  ).toHaveAttribute("href", /\/contact\?subject=data-error/);
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
  // Bloc 129 §1.2 : l'accent et le fond sombre ont changé de valeur.
  expect(manifest.theme_color).toBe("#b8a0f5");
  expect(manifest.background_color).toBe("#14131a");
  // Bloc 96: three sizes — 180 (iPhone), 192 and 512 (PWA).
  expect(manifest.icons).toHaveLength(3);
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

test("Bloc 95: every manifest icon is served at the dimensions it declares", async ({
  request,
}) => {
  const res = await request.get("/manifest.webmanifest");
  const { icons } = JSON.parse(await res.text());
  expect(icons.length).toBeGreaterThan(0);

  for (const icon of icons) {
    const file = await request.get(icon.src);
    expect(file.status(), `${icon.src} is not served`).toBe(200);
    expect(file.headers()["content-type"]).toContain("image/png");

    // Read the header out of the bytes actually served, so this compares the
    // real image against what the manifest promises rather than trusting the
    // declaration on both sides.
    const png = parsePngHeader(await file.body());
    expect(`${png.width}x${png.height}`, `${icon.src} has the wrong size`).toBe(
      icon.sizes,
    );
    // Bloc 96: and that it is the plain opaque true-colour PNG an OS icon
    // pipeline expects — the property the blank iOS tile turned on.
    expect(png.colorType, `${icon.src} is not a true-colour PNG`).toBe(
      truecolorPng,
    );
    expect(png.transparent).toBe(false);
  }
});

// Bloc 96: iOS drew an empty tile for the installed shortcut. The markup was
// already right, so what this checks is the whole chain end to end — the tags
// a public page really serves, and the bytes each of their URLs really returns.
test("Bloc 96: every apple-touch-icon tag serves the image it declares", async ({
  page,
  request,
}) => {
  await page.goto("/fr/tools/villes");
  // iOS ignores the manifest on older versions and uses these tags, which the
  // src/app/apple-icon*.png file convention emits.
  const tags = page.locator('link[rel="apple-touch-icon"]');
  const count = await tags.count();
  expect(
    count,
    "no <link rel=apple-touch-icon> in the document head",
  ).toBeGreaterThan(0);

  const sizes: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const tag = tags.nth(index);
    const href = await tag.getAttribute("href");
    const declared = await tag.getAttribute("sizes");
    expect(href, "an apple-touch-icon tag has no href").toBeTruthy();

    const res = await request.get(href!);
    expect(res.status(), `${href} is not served`).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");

    const png = parsePngHeader(await res.body());
    expect(`${png.width}x${png.height}`, `${href} is not ${declared}`).toBe(
      declared,
    );
    expect(png.colorType, `${href} is not a true-colour PNG`).toBe(
      truecolorPng,
    );
    expect(png.transparent).toBe(false);
    sizes.push(declared!);
  }

  // The regression itself: only a 512×512 was on offer, a size no Apple device
  // asks for. 180 is the iPhone's.
  expect(sizes).toContain("180x180");
});

test("Bloc 96: the icon iOS fetches by convention is there too", async ({
  request,
}) => {
  // When the markup yields nothing it can use, iOS requests this well-known
  // path on its own. It is a plain file in public/, so its URL carries no
  // hashed query string.
  const res = await request.get("/apple-touch-icon.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");

  const png = parsePngHeader(await res.body());
  expect({ width: png.width, height: png.height }).toEqual({
    width: 180,
    height: 180,
  });
  expect(png.colorType).toBe(truecolorPng);
});

// Bloc 103: iOS 26 gave installed web apps a Liquid Glass status-bar strip and
// iOS/iPadOS 27 made it high-contrast enough to notice. WebKit fills that strip
// from <meta name="theme-color">; with no colour declared it samples the page's
// top edge instead, and ML-Helper's top edge is a radial gradient (globals.css
// body), which resolves to no solid colour — so iOS blurred the page's own
// header there, over the ML-HELPER wordmark and the nav buttons.
//
// The colour therefore has to be present, has to match what the page actually
// renders, and has to follow a theme change. It is also why the site must never
// adopt apple-mobile-web-app-status-bar-style="black-translucent": that is the
// setting that puts page content UNDER the transparent strip in the first
// place, which is the configuration every published report of this bug shares.
test("Bloc 103: declares the status-bar colour, follows the theme, and never goes translucent", async ({
  page,
  request,
}) => {
  const served = await (await request.get("/fr/tools/villes")).text();
  // black-translucent is the setting that puts page content UNDER the
  // transparent strip, which is the configuration every published report of
  // this bug shares. The site must never adopt it.
  expect(
    served,
    "black-translucent is what makes iOS paint the page under the status bar",
  ).not.toContain("black-translucent");
  // Both colours reach the document inside the pre-paint script, which is
  // what owns the tag (see the root layout for why it is not server-rendered
  // metadata). Deleting that script would leave iOS with no colour to paint
  // the strip with, and nothing else here would notice.
  expect(
    served,
    "the pre-paint script no longer carries the two theme colours",
  ).toMatch(/theme-color[\s\S]{0,400}#e5e7ec[\s\S]{0,40}#14131a/);

  // A saved light theme, so the toggle below moves light -> dark and the
  // deferred mount read cannot be what makes the assertion pass. Saved once
  // and then reloaded, rather than re-seeded on every document, so the
  // reload at the end reads back what the toggle actually persisted.
  await page.goto("/fr/tools/villes");
  await page.evaluate(() =>
    window.localStorage.setItem("mlhelper_theme", "light"),
  );
  await page.reload();
  // aria-pressed flips only once ThemeToggle's deferred read has landed, so
  // waiting on it pins the click below to the toggle's own work.
  const toggle = page.getByRole("button", { name: "Passer en thème sombre" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const themeColor = page.locator('meta[name="theme-color"]');
  // Exactly one: a second tag would leave the browser reading whichever comes
  // first, which is how a light page kept showing a dark strip.
  await expect(themeColor).toHaveCount(1);
  await expect(themeColor).toHaveAttribute("content", "#e5e7ec");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // The strip would otherwise stay the light theme's colour against a dark page.
  await expect(themeColor).toHaveAttribute("content", "#14131a");
  await expect(themeColor).toHaveCount(1);

  // And the choice survives a reload, set before first paint rather than
  // corrected afterwards.
  await page.reload();
  await expect(themeColor).toHaveAttribute("content", "#14131a");
});
