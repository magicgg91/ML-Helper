import { expect, test, type Page } from "@playwright/test";

// Bloc 48/C: the public switcher is now a custom ARIA listbox (button
// trigger + role="listbox" popup), not a native <select>.
async function switchLocale(page: Page, locale: "en" | "fr") {
  const document = page.locator("html");
  if ((await document.getAttribute("lang")) === locale) return;

  await page.getByRole("button", { name: /Language|Langue/ }).click();
  await page
    .getByRole("listbox", { name: /Language|Langue/ })
    .getByRole("option", { name: locale.toUpperCase() })
    .click();
  await expect(document).toHaveAttribute("lang", locale);
}

// Bloc 50/1b: the reference catalog moved off the guides hub onto its own
// /referentiels root (src/app/(public)/referentiels/page.tsx). Bloc 52/A:
// the index title was the short "Référentiels", not "Tous les
// référentiels". Bloc 53/D: that short title was replaced by the
// homepage's own référentiels intro title ("Retrouve les données clés"),
// same treatment /tools got in Bloc 38/K — the <title> metadata still says
// "Référentiels" (see referentiels-page.test.tsx). Bloc 52/B: the switcher
// nav is scoped to a specific reference's page — the index already shows
// every reference as an illustrated tile, so it must NOT repeat there.
test("shows every reference table on the référentiels hub", async ({
  page,
}) => {
  await page.goto("/referentiels");
  await switchLocale(page, "fr");
  await expect(
    page.getByRole("heading", { name: "Retrouve les données clés", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /référentiels/i }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Équipements de Combat" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Équipements d’Expédition" }),
  ).toBeVisible();

  await switchLocale(page, "en");
  await expect(
    page.getByRole("heading", { name: "Find the exact numbers", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Combat Equipment" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Expedition Equipment" }),
  ).toBeVisible();
});

test("shows the reference switcher nav only on a specific reference's page, never on the hub", async ({
  page,
}) => {
  await page.goto("/referentiels");
  await expect(
    page.getByRole("navigation", { name: "Référentiels" }),
  ).not.toBeVisible();

  await page.goto("/referentiels/combat-equipment");
  await expect(
    page.getByRole("navigation", { name: "Référentiels" }),
  ).toBeVisible();
});

test("finds a guide, a reference table and a tool from the site-wide search on any page", async ({
  page,
}) => {
  await page.goto("/tools");
  await switchLocale(page, "fr");
  const search = page.getByRole("searchbox", {
    name: "Rechercher sur le site",
  });

  await search.fill("visible");
  await expect(
    page.getByRole("link", { name: /Guide visible/ }),
  ).toHaveAttribute("href", new RegExp("/guides/guide-visible$"));

  await search.fill("équipements de combat");
  await expect(
    page.getByRole("link", { name: /Équipements de Combat/ }),
  ).toHaveAttribute("href", new RegExp("/referentiels/combat-equipment$"));

  // Bloc 36/A: "gemmes" now matches both the Gems tool and its new
  // reference, sharing the exact same label — scope to the tool's exact
  // accessible name ("Outil Gemmes") to keep testing the tool match here.
  await search.fill("gemmes");
  await expect(
    page.getByRole("link", { name: "Outil Gemmes" }),
  ).toHaveAttribute("href", new RegExp("/tools/competences$"));

  await search.fill("introuvable");
  await expect(page.getByText("Aucun résultat.")).toBeVisible();

  await switchLocale(page, "en");
  const searchEn = page.getByRole("searchbox", {
    name: "Search the site",
  });
  await searchEn.fill("visible");
  await expect(
    page.getByRole("link", { name: /Visible guide/ }),
  ).toHaveAttribute("href", new RegExp("/guides/guide-visible$"));
});

test("translates the interface around a localized published guide", async ({
  page,
}) => {
  await page.goto("/guides/guide-visible");
  await switchLocale(page, "en");
  await expect(
    page.getByText("Guide in Getting started & progressing"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Visible guide" }),
  ).toBeVisible();
  await expect(page.getByText("Test content")).toBeVisible();

  await switchLocale(page, "fr");
  await expect(page.getByText("Guide · Débuter & progresser")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Guide visible" }),
  ).toBeVisible();
});

test("translates combat equipment filters and result columns", async ({
  page,
}) => {
  await page.goto("/referentiels/combat-equipment");
  await switchLocale(page, "fr");
  // Bloc 75/A: Pouciel merge cost, gem slots and Pouciel-at-destruction are
  // now 1 merged table (Fusion/Gemmes/Destruction rows) titled "Pouciel &
  // Gemmes" instead of "Pouciel" being its own single-row table.
  await expect(
    page.getByRole("heading", { name: "Pouciel & Gemmes", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Famille", { exact: true })).toBeVisible();

  await switchLocale(page, "en");
  await expect(
    page.getByRole("heading", { name: "Pouciel & Gems", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Family", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack" })).toBeVisible();
});

test("translates expedition equipment filters, columns and status", async ({
  page,
}) => {
  await page.goto("/referentiels/expedition-equipment");
  await switchLocale(page, "fr");
  // Bloc 39: the "Stat secondaire" column header is gone (table -> tile
  // grid) — assert the same translation coverage through a stat name that
  // actually renders on a tile instead (Vanna's Bourse: secondary stat
  // "Récupération"). Not `exact` — the stat name is a bare text node
  // sharing its tile line with the % value, not its own element.
  await expect(page.getByText("Récupération").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Or" })).toBeVisible();

  await switchLocale(page, "en");
  await expect(page.getByText("Recovery").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Equipment" })).toBeVisible();
});
