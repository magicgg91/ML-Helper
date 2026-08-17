import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("first launch creates the one-time Super Admin", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin\/setup$/);
  await expect(
    page.getByRole("heading", { name: "Créer le premier Super Admin" }),
  ).toBeVisible();
  await page.getByLabel("Nom d’utilisateur").fill("rootadmin");
  await page.getByLabel("Mot de passe").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Créer le Super Admin" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("setup cannot be reused after a Super Admin exists", async ({ page }) => {
  const status = await page.request.post("/api/admin/setup", {
    data: {
      username: "second-root",
      password: "another-secure-password",
    },
  });
  expect(status.status()).toBe(409);
  await page.goto("/admin/setup");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Créer le premier Super Admin" }),
  ).toHaveCount(0);
});

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
  await expect(
    page.getByRole("cell", { name: "super_admin" }).first(),
  ).toBeVisible();
  await expect(page.getByText(/user:/).first()).toBeVisible();

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

test("direct admin URLs enforce all four roles", async ({ browser }) => {
  test.setTimeout(60_000);
  const rootContext = await browser.newContext();
  const root = await rootContext.newPage();
  await root.goto("/login");
  await root.getByLabel("Username").fill("rootadmin");
  await root.getByLabel("Password").fill("correct-horse-battery-staple");
  await root.getByRole("button", { name: "Sign in" }).click();
  await expect(root).toHaveURL(/\/admin$/);

  const accounts = [
    ["role-admin", "admin"],
    ["role-guides", "guides_manager"],
    ["role-calculators", "calculators_manager"],
  ] as const;
  for (const [username, role] of accounts) {
    const status = await root.evaluate(
      async ({ username, role }) =>
        fetch("/api/admin/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username,
            role,
            password: "role-test-password",
          }),
        }).then((response) => response.status),
      { username, role },
    );
    expect(status).toBe(201);
  }

  const allSections = [
    "/admin/guides",
    "/admin/calculators",
    "/admin/references",
    "/admin/content",
    "/admin/users",
    "/admin/logs",
  ];
  const cases = [
    {
      username: "rootadmin",
      password: "correct-horse-battery-staple",
      allowed: allSections,
    },
    {
      username: "role-admin",
      password: "role-test-password",
      allowed: allSections.filter((path) => path !== "/admin/users"),
    },
    {
      username: "role-guides",
      password: "role-test-password",
      allowed: ["/admin/guides"],
    },
    {
      username: "role-calculators",
      password: "role-test-password",
      allowed: ["/admin/calculators", "/admin/references"],
    },
  ];

  for (const roleCase of cases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Username").fill(roleCase.username);
    await page.getByLabel("Password").fill(roleCase.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    for (const path of allSections) {
      const response = await page.goto(path);
      const expectedStatus = roleCase.allowed.includes(path) ? 200 : 403;
      expect(response?.status(), `${roleCase.username} / ${path}`).toBe(
        expectedStatus,
      );
      if (expectedStatus === 403)
        await expect(
          page.getByRole("heading", { name: "Accès interdit" }),
        ).toBeVisible();
    }
    await context.close();
  }
  await rootContext.close();
});
