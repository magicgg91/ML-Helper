import { expect, test } from "@playwright/test";

test("public routes expose persistent player settings", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Prépare ta prochaine progression." }),
  ).toBeVisible();

  await page.getByText("Paramètres du joueur", { exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Niveau du joueur", exact: true })
    .fill("30");
  await page.getByText("Compétences avec équipement", { exact: true }).click();
  await page
    .getByRole("spinbutton", {
      name: "Attaque avec équipement",
      exact: true,
    })
    .fill("12.5");
  await page.goto("/tools");

  await page.getByText("Paramètres du joueur", { exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Niveau du joueur",
      exact: true,
    }),
  ).toHaveValue("30");
  await page.getByText("Compétences avec équipement", { exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Attaque avec équipement",
      exact: true,
    }),
  ).toHaveValue("12.5");
  await page.goto("/guides/apercu");
  await expect(page.getByRole("heading", { name: "apercu" })).toBeVisible();
});

test("the Cities category exposes its three working calculators", async ({
  page,
}) => {
  await page.goto("/tools/villes");
  await expect(page.getByRole("heading", { name: "Villes" })).toBeVisible();
  await expect(page.getByTestId("city-cost-one")).toHaveText("10 or");

  await page.getByRole("tab", { name: "Niveau Max Atteignable" }).click();
  await page.getByRole("spinbutton", { name: "Or disponible" }).fill("0.044");
  await expect(page.getByTestId("max-level-result")).toHaveText("4");

  await page.getByRole("tab", { name: "Production" }).click();
  await expect(page.getByText("Or — Production totale")).toBeVisible();
  await expect(page.getByTestId("full-production-gold")).toHaveText("200/h");
});

test("Ranking converts position and percentage into league ranges", async ({
  page,
}) => {
  await page.goto("/tools/classement");
  await expect(
    page.getByRole("heading", { name: "Classement", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("ranking-total")).toHaveText("1 000");
  await expect(
    page.getByLabel("Échelle de classement de 100% à 0%"),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Descente Platine" }),
  ).toBeVisible();

  await page
    .locator(".ranking-calculator")
    .getByLabel("Ligue")
    .selectOption("bronze");
  await expect(page.getByRole("status")).toContainText(
    "à définir dans l’administration",
  );
});

test("a super admin signs in, creates an admin, and sees the audit log", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("rootadmin");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("link", { name: "Users" }).click();
  const createForm = page.locator("form").first();
  await createForm.locator('input[name="username"]').fill("phase1admin");
  await createForm.locator('input[name="password"]').fill("phase-one-password");
  await createForm.locator('select[name="role"]').selectOption("admin");
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("status")).toHaveText("User created");
  await expect(page.getByRole("cell", { name: "phase1admin" })).toBeVisible();

  await page.getByRole("link", { name: "Logs" }).click();
  await expect(page.getByRole("cell", { name: "create" })).toBeVisible();
  await expect(page.getByText(/user:/)).toBeVisible();
});
