import { expect, test } from "@playwright/test";

// Bloc 48/C: the public switcher is now a custom ARIA listbox (button
// trigger + role="listbox" popup), not a native <select>.
async function selectLanguage(
  page: import("@playwright/test").Page,
  locale: string,
) {
  await page.getByRole("button", { name: /Language|Langue/ }).click();
  await page
    .getByRole("listbox", { name: /Language|Langue/ })
    .getByRole("option", { name: locale.toUpperCase() })
    .click();
}

test("renders every tool category in French and English", async ({ page }) => {
  await page.goto("/tools");
  await selectLanguage(page, "fr");
  await expect(page.getByRole("heading", { name: "Villes" })).toBeVisible();
  // Bloc 133 §C : le décompte est une pastille contre le nom — le chiffre se
  // voit, la phrase entière est le texte masqué qui le lit.
  await expect(
    page
      .getByRole("heading", { name: "Combat" })
      .locator("..")
      .locator(".tool-count-badge"),
  ).toHaveText("22 outils");

  await selectLanguage(page, "en");
  await expect(page.getByRole("heading", { name: "Cities" })).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "Combat" })
      .locator("..")
      .locator(".tool-count-badge"),
  ).toHaveText("22 tools");

  await page.goto("/tools/combat");
  await expect(page.getByRole("tab", { name: "XP Gain Rate" })).toBeVisible();
  await selectLanguage(page, "fr");
  await expect(
    page.getByRole("tab", { name: "Taux de gain d’XP" }),
  ).toBeVisible();
  await selectLanguage(page, "en");
  await expect(page.getByRole("tab", { name: "XP Gain Rate" })).toBeVisible();

  await page.goto("/tools/villes");
  await expect(page.getByRole("tab", { name: "City Cost" })).toBeVisible();
  await expect(page.getByText("Player settings")).toBeVisible();
  await selectLanguage(page, "fr");
  await expect(page.getByRole("tab", { name: "Coût de Ville" })).toBeVisible();
  await expect(page.getByText("Paramètres du joueur")).toBeVisible();

  await page.goto("/tools/classement");
  // Bloc 129 §3.8 : la page porte maintenant un en-tête dont la description
  // reprend les mots de l'outil — la recherche est donc limitée au contenu,
  // sous l'en-tête, sinon elle trouve les deux.
  await expect(page.locator("main").getByText("Ton rang actuel")).toBeVisible();
  await selectLanguage(page, "en");
  await expect(
    page.locator("main").getByText("Your current rank"),
  ).toBeVisible();

  await page.goto("/tools/competences");
  await expect(
    page.getByRole("tab", { name: "Combat Equipment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Expedition Equipment" }),
  ).toBeVisible();
  await selectLanguage(page, "fr");
  await expect(
    page.getByRole("tab", { name: "Équipement de Combat", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Équipements d’Expédition" }),
  ).toBeVisible();
});
