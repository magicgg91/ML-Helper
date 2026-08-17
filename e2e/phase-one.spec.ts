import { expect, test } from "@playwright/test";

test("tool routes alone expose persistent player settings", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Prépare ta prochaine progression." }),
  ).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);

  await page.goto("/tools");
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
  await page.goto("/tools/villes");

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
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);
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

test("Skills exposes gem distributions and exact templar costs", async ({
  page,
}) => {
  await page.goto("/tools/competences");
  await expect(
    page.getByRole("heading", { name: "Compétences", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /Amulette Vide/ })
    .first()
    .click();
  await page
    .getByRole("combobox", { name: "Équipement Attaque Amulette" })
    .selectOption("Légendaire|Spirit Fyra");
  await expect(page.getByText("+10% (10%)").first()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("mlhelper_stuff_simulator")),
    )
    .toContain("Spirit Fyra");

  await page.getByRole("tab", { name: "Comparaison de stuff" }).click();
  const comparisonStars = page.getByRole("combobox", {
    name: "Étoiles équipement Attaque Amulette",
  });
  await comparisonStars.nth(1).selectOption("8");
  await expect(page.locator(".diff-positive").first()).toBeVisible();

  await page.getByRole("tab", { name: "Gemmes" }).click();
  await page.getByRole("tab", { name: "Budget disponible" }).click();
  await page.getByRole("spinbutton", { name: "Emplacements budget" }).fill("3");
  await page
    .getByRole("spinbutton", { name: "Budget disponible en saphirs" })
    .fill("112000");
  await expect(page.getByTestId("gem-budget-distribution")).toContainText(
    "1 gemme 4★ + 2 gemmes 3★",
  );

  await page.getByRole("tab", { name: "Templiers" }).click();
  await page
    .getByRole("spinbutton", { name: "Niveau Templier cible" })
    .fill("3");
  await expect(page.getByTestId("templar-cost")).toHaveText("599 Pouciel");

  await page.getByRole("button", { name: "Défense" }).click();
  await page
    .getByRole("spinbutton", { name: "Niveau Templier cible" })
    .fill("2");
  await page.getByRole("button", { name: "Attaque" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Niveau Templier cible" }),
  ).toHaveValue("3");
});

test("Reference tables filter combat and flag expedition hypotheses", async ({
  page,
}) => {
  await page.goto("/tools/referentiels");
  await expect(
    page.getByRole("heading", { name: "Référentiels", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Attaque" }).click();
  await page
    .getByRole("searchbox", { name: "Recherche libre" })
    .fill("Spirit Fyra");
  await page
    .getByRole("combobox", { name: "Niveau d’étoile" })
    .selectOption("5");
  await expect(page.getByText("9 lignes — valeurs à 5★")).toBeVisible();
  await expect(page.getByText("18%").first()).toBeVisible();
  await page.getByRole("tab", { name: "Équipement d’Expédition" }).click();
  await expect(page.getByText(/projection par étoile est une/)).toContainText(
    "hypothèse non confirmée",
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
  await expect(page.getByText("Calculateurs actifs")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dernières actions" }),
  ).toBeVisible();
  const adminNav = page.getByRole("navigation", {
    name: "Navigation administration",
  });

  await adminNav.getByRole("link", { name: "Utilisateurs" }).click();
  const createForm = page.locator("form").first();
  await createForm.locator('input[name="username"]').fill("phase1admin");
  await createForm.locator('input[name="password"]').fill("phase-one-password");
  await createForm.locator('select[name="role"]').selectOption("admin");
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("status")).toHaveText("User created");
  await expect(page.getByRole("cell", { name: "phase1admin" })).toBeVisible();

  await adminNav.getByRole("link", { name: "Logs" }).click();
  await expect(page.getByRole("cell", { name: "create" })).toBeVisible();
  await expect(page.getByText(/user:/)).toBeVisible();

  await adminNav.getByRole("link", { name: "Référentiels" }).click();
  await page.getByRole("link", { name: "Équipements de Combat" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Référentiel — Équipements de Combat",
    }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(180);
  await expect(page.getByLabel("Ligne 1 set")).not.toHaveValue("");

  await adminNav.getByRole("link", { name: "Référentiels" }).click();
  await page.getByRole("link", { name: "Équipement d’Expédition" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(120);
  await expect(page.getByLabel("Expédition ligne 1 set")).not.toHaveValue("");

  await adminNav.getByRole("link", { name: "Référentiels" }).click();
  await page.getByRole("link", { name: "Templiers" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await expect(
    page.getByRole("spinbutton", { name: "Coût Templier niveau 20" }),
  ).toHaveValue("21929");
});
