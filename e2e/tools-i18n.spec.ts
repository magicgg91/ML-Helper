import { expect, test } from "@playwright/test";

async function selectLanguage(
  page: import("@playwright/test").Page,
  locale: string,
) {
  await page.getByLabel("Language / Langue").selectOption(locale);
}

test("renders every tool category in French and English", async ({ page }) => {
  await page.goto("/tools");
  await selectLanguage(page, "fr");
  await expect(page.getByRole("heading", { name: "Villes" })).toBeVisible();
  await expect(page.getByText("Bientôt disponible")).toBeVisible();

  await selectLanguage(page, "en");
  await expect(page.getByRole("heading", { name: "Cities" })).toBeVisible();
  await expect(page.getByText("Coming soon")).toBeVisible();

  await page.goto("/tools/villes");
  await expect(page.getByRole("tab", { name: "City Cost" })).toBeVisible();
  await expect(page.getByText("Player settings")).toBeVisible();
  await selectLanguage(page, "fr");
  await expect(page.getByRole("tab", { name: "Coût de Ville" })).toBeVisible();
  await expect(page.getByText("Paramètres du joueur")).toBeVisible();

  await page.goto("/tools/classement");
  await expect(page.getByText("Ton rang actuel")).toBeVisible();
  await selectLanguage(page, "en");
  await expect(page.getByText("Your current rank")).toBeVisible();

  await page.goto("/tools/competences");
  await expect(
    page.getByRole("tab", { name: "Equipment Simulator" }),
  ).toBeVisible();
  await selectLanguage(page, "fr");
  await expect(
    page.getByRole("tab", { name: "Simulateur de Stuff" }),
  ).toBeVisible();
});
