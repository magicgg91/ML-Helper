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

test("shows every reference table with no category filter on the guides hub", async ({
  page,
}) => {
  await page.goto("/guides");
  await switchLocale(page, "fr");
  await expect(
    page.getByRole("heading", { name: "Référentiels" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /référentiels/i }),
  ).toHaveCount(0);
  await expect(page.getByText("Équipements de Combat")).toBeVisible();
  await expect(page.getByText("Équipements d’Expédition")).toBeVisible();

  await switchLocale(page, "en");
  await expect(
    page.getByRole("heading", { name: "Reference tables" }),
  ).toBeVisible();
  await expect(page.getByText("Combat Equipment")).toBeVisible();
  await expect(page.getByText("Expedition Equipment")).toBeVisible();
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
  ).toHaveAttribute("href", "/guides/guide-visible");

  await search.fill("équipements de combat");
  await expect(
    page.getByRole("link", { name: /Équipements de Combat/ }),
  ).toHaveAttribute("href", "/guides/referentiels/combat-equipment");

  // Bloc 36/A: "gemmes" now matches both the Gems tool and its new
  // reference, sharing the exact same label — scope to the tool's exact
  // accessible name ("Outil Gemmes") to keep testing the tool match here.
  await search.fill("gemmes");
  await expect(
    page.getByRole("link", { name: "Outil Gemmes" }),
  ).toHaveAttribute("href", "/tools/competences");

  await search.fill("introuvable");
  await expect(page.getByText("Aucun résultat.")).toBeVisible();

  await switchLocale(page, "en");
  const searchEn = page.getByRole("searchbox", {
    name: "Search the site",
  });
  await searchEn.fill("visible");
  await expect(
    page.getByRole("link", { name: /Visible guide/ }),
  ).toHaveAttribute("href", "/guides/guide-visible");
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
  await page.goto("/guides/referentiels/combat-equipment");
  await switchLocale(page, "fr");
  // Bloc 35/2.2: Pouciel is no longer a per-row column — it's the title of
  // its own small rarity-indexed table, so it now appears twice (heading +
  // row label); scope to the heading to disambiguate.
  await expect(
    page.getByRole("heading", { name: "Pouciel", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Famille", { exact: true })).toBeVisible();

  await switchLocale(page, "en");
  await expect(
    page.getByRole("heading", { name: "Skydust", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Family", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack" })).toBeVisible();
});

test("translates expedition equipment filters, columns and status", async ({
  page,
}) => {
  await page.goto("/guides/referentiels/expedition-equipment");
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
