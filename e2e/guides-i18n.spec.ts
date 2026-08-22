import { expect, test, type Page } from "@playwright/test";

async function switchLocale(page: Page, locale: "en" | "fr") {
  const document = page.locator("html");
  if ((await document.getAttribute("lang")) === locale) return;

  await page
    .getByRole("group", { name: /Language|Langue/ })
    .getByRole("button", { name: locale.toUpperCase() })
    .click();
  await expect(document).toHaveAttribute("lang", locale);
}

test("translates the guides hub headings", async ({ page }) => {
  await page.goto("/guides");
  await switchLocale(page, "fr");
  await expect(
    page.getByRole("heading", { name: "Référentiels" }),
  ).toBeVisible();

  await switchLocale(page, "en");
  await expect(
    page.getByRole("heading", { name: "Reference tables" }),
  ).toBeVisible();
  await expect(page.getByText("Combat Equipment")).toBeVisible();
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

  await search.fill("gemmes");
  await expect(page.getByRole("link", { name: /Gemmes/ })).toHaveAttribute(
    "href",
    "/tools/competences",
  );

  await search.fill("introuvable");
  await expect(page.getByText("Aucun résultat.")).toBeVisible();

  await switchLocale(page, "en");
  await search.fill("visible");
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
  await expect(page.getByText("Pouciel", { exact: true })).toBeVisible();
  await expect(page.getByText("Famille", { exact: true })).toBeVisible();

  await switchLocale(page, "en");
  await expect(page.getByText("Skydust", { exact: true })).toBeVisible();
  await expect(page.getByText("Family", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack" })).toBeVisible();
});

test("translates expedition equipment filters, columns and status", async ({
  page,
}) => {
  await page.goto("/guides/referentiels/expedition-equipment");
  await switchLocale(page, "fr");
  await expect(page.getByText(/hypothèse non confirmée/)).toBeVisible();
  await expect(
    page.getByText("Stat secondaire", { exact: true }),
  ).toBeVisible();

  await switchLocale(page, "en");
  await expect(page.getByText(/unconfirmed assumption/)).toBeVisible();
  await expect(page.getByText("Secondary stat", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Equipment" })).toBeVisible();
});
