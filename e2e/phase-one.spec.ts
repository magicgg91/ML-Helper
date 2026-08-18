import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("health endpoint confirms application and database availability", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});

test("first launch creates the one-time Super Admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/setup$/);
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
  await expect(page.locator(".home-carousel-track figure")).toHaveCount(3);
  await expect(page.locator(".home-feature")).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Voir les simulateurs" }),
  ).toHaveAttribute("href", "/tools");
  await expect(
    page.getByRole("link", { name: "Parcourir les guides" }),
  ).toHaveAttribute("href", "/guides");
  const publicThemeToggle = page.getByRole("button", {
    name: "Activer le mode clair",
  });
  await expect(publicThemeToggle).toHaveText("☀");
  await publicThemeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightOverlay = await page
    .locator(".home-carousel")
    .evaluate((node) => getComputedStyle(node, "::after").backgroundImage);
  expect(lightOverlay).toContain("240, 242, 245");
  await page.getByLabel("Language / Langue").selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Plan your next progression." }),
  ).toBeVisible();
  await page.goto("/guides");
  await expect(
    page.getByRole("heading", { name: "Visible guide" }),
  ).toBeVisible();
  await page.getByLabel("Language / Langue").selectOption("fr");
  await expect(
    page.getByRole("heading", { name: "Guide visible" }),
  ).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);

  await page.goto("/tools");
  await expect(page.locator(".tool-category-card")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Combat" })).toBeVisible();
  await expect(page.getByText("Bientôt disponible")).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Catégories de simulateurs" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Ouvrir la catégorie" }).first().click();
  await expect(page).toHaveURL(/\/tools\/villes$/);
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
  await page.reload();

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
  await page.goto("/guides/guide-visible");
  await expect(
    page.getByRole("heading", { name: "Guide visible" }),
  ).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);
});

test("calculator pages only repeat names in their navigation tabs", async ({
  page,
}) => {
  for (const slug of ["villes", "classement", "competences", "referentiels"]) {
    await page.goto(`/tools/${slug}`);
    await expect(page.locator("main > .lead")).toHaveCount(0);
    await expect(page.locator("main h2")).toHaveCount(0);
  }
});

test("the Cities category exposes its three working calculators", async ({
  page,
}) => {
  await page.goto("/tools/villes");
  await expect(page.getByRole("link", { name: "Villes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
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
  await expect(page.getByRole("link", { name: "Classement" })).toHaveAttribute(
    "aria-current",
    "page",
  );
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
  await expect(page.getByRole("link", { name: "Compétences" })).toHaveAttribute(
    "aria-current",
    "page",
  );

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
    page.getByRole("link", { name: "Référentiels" }),
  ).toHaveAttribute("aria-current", "page");
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
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("button", { name: "Activer le mode clair" }),
  ).toHaveText("☀");
  await expect(page.getByText(/\d+ activés \/ \d+ au total/)).toBeVisible();
  await expect(page.getByText(/\d+ publiés \/ \d+ au total/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dernières actions" }),
  ).toBeVisible();
  const adminNav = page.getByRole("navigation", {
    name: "Navigation administration",
  });

  await adminNav.getByRole("link", { name: "Utilisateurs" }).click();
  const createForm = page.locator('form:has(input[name="username"])');
  await createForm.locator('input[name="username"]').fill("phase1admin");
  await createForm.locator('input[name="password"]').fill("phase-one-password");
  await createForm.locator('select[name="role"]').selectOption("admin");
  await createForm
    .getByRole("button", { name: /Create user|Créer l’utilisateur/ })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    /User created|Utilisateur créé/,
  );
  await expect(page.getByRole("cell", { name: "phase1admin" })).toBeVisible();

  await adminNav.getByRole("link", { name: /Logs|Historique/ }).click();
  await expect(
    page.getByRole("cell", {
      name: "rootadmin a créé l’utilisateur phase1admin",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "super_admin" }).first(),
  ).toBeVisible();

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
  await root.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await root
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await root.getByRole("button", { name: /Sign in|Se connecter/ }).click();
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
    await page.getByLabel(/Username|Identifiant/).fill(roleCase.username);
    await page.getByLabel(/Password|Mot de passe/).fill(roleCase.password);
    await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
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
    const canAuthor = roleCase.username !== "role-calculators";
    const canModerate = ["rootadmin", "role-admin"].includes(roleCase.username);
    const slug = `rights-${roleCase.username}`;
    const payload = {
      slug,
      category: "debutants",
      coverImage: "",
      translations: {
        fr: {
          title: `Guide ${roleCase.username}`,
          excerpt: "Résumé",
          content: "Paragraphe",
        },
        en: {
          title: `Guide ${roleCase.username}`,
          excerpt: "Summary",
          content: "Paragraph",
        },
      },
    };
    const created = await page.request.post("/api/admin/guides", {
      data: payload,
    });
    expect(created.status(), `${roleCase.username} create`).toBe(
      canAuthor ? 201 : 403,
    );
    const guideId = canAuthor
      ? (await created.json()).id
      : "guide-visibility-test";
    expect(
      (
        await page.request.patch(`/api/admin/guides/${guideId}`, {
          data: payload,
        })
      ).status(),
      `${roleCase.username} edit`,
    ).toBe(canAuthor ? 200 : 403);
    expect(
      (
        await page.request.patch(`/api/admin/guides/${guideId}/active`, {
          data: { active: false },
        })
      ).status(),
      `${roleCase.username} toggle`,
    ).toBe(canAuthor ? 200 : 403);
    expect(
      (
        await page.request.patch(`/api/admin/guides/${guideId}/status`, {
          data: { status: "pending_review" },
        })
      ).status(),
      `${roleCase.username} submit`,
    ).toBe(canAuthor ? 200 : 403);
    expect(
      (
        await page.request.patch(`/api/admin/guides/${guideId}/status`, {
          data: { status: "published" },
        })
      ).status(),
      `${roleCase.username} publish`,
    ).toBe(canModerate ? 200 : 403);
    expect(
      (await page.request.delete(`/api/admin/guides/${guideId}`)).status(),
      `${roleCase.username} delete`,
    ).toBe(canModerate ? 200 : 403);
    await context.close();
  }
  await rootContext.close();
});

test("guide editor supports the complete editorial lifecycle", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/guides/new");
  await page.getByLabel("Titre (FR)").fill("Guide cycle complet");
  await page.getByLabel("Résumé (FR)").fill("Résumé du cycle complet");
  await page
    .getByLabel("Contenu Markdown (FR)")
    .fill("## Départ\n\nContenu initial du guide.");
  await page.getByRole("button", { name: "Soumettre en review" }).click();
  await expect(page).toHaveURL(/\/admin\/guides\/.+/);
  await expect(page.getByRole("status")).toHaveText("Guide enregistré.");
  await page.getByLabel("Titre (FR)").fill("Guide édité et publié");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Guide enregistré.");
  await page.goto("/admin/guides");
  const row = page.getByRole("row", { name: /Guide édité et publié/ });
  await expect(row.getByRole("combobox")).toHaveValue("pending_review");
  await row.getByRole("combobox").selectOption("published");
  await expect(page.getByRole("status")).toHaveText("Statut enregistré.");
  await page.goto("/guides");
  await expect(page.getByText("Guide édité et publié")).toBeVisible();
  await page.goto("/admin/guides");
  const publishedRow = page.getByRole("row", { name: /Guide édité et publié/ });
  await publishedRow.getByRole("button", { name: "Désactiver" }).click();
  await expect(page.getByRole("status")).toHaveText("Guide désactivé.");
  await page.goto("/guides");
  await expect(page.getByText("Guide édité et publié")).toHaveCount(0);
  await page.goto("/admin/guides");
  const disabledRow = page.getByRole("row", { name: /Guide édité et publié/ });
  await disabledRow.getByRole("button", { name: "Activer" }).click();
  await expect(page.getByRole("status")).toHaveText("Guide activé.");
  await page.goto("/guides");
  await expect(page.getByText("Guide édité et publié")).toBeVisible();
  await page.goto("/admin/guides");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row", { name: /Guide édité et publié/ })
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Guide supprimé définitivement.",
  );
  await expect(page.getByText("Guide édité et publié")).toHaveCount(0);
});

test("calculator visibility and guide publication are reversible", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("role-admin");
  await page.getByLabel(/Password|Mot de passe/).fill("role-test-password");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const disabled = await page.request.patch(
    "/api/admin/calculators/calculator-ranking",
    { data: { active: false } },
  );
  expect(disabled.status()).toBe(200);
  expect(await disabled.json()).toMatchObject({
    id: "calculator-ranking",
    active: false,
  });
  await page.goto("/tools");
  const rankingCard = page
    .getByRole("article")
    .filter({ hasText: "Classement" });
  await expect(rankingCard).toHaveAttribute("data-disabled", "true");
  await expect(rankingCard.getByRole("link")).toHaveCount(0);

  await page.goto("/admin/guides");
  const guideStatus = page.getByLabel("Statut de Guide visible");
  await guideStatus.selectOption("draft");
  await expect(page.getByRole("status")).toHaveText("Statut enregistré.");
  await page.goto("/guides");
  await expect(page.getByText("Guide visible")).toHaveCount(0);
  await page.goto("/admin/guides");
  await expect(page.getByRole("cell", { name: "Guide visible" })).toBeVisible();
  await expect(page.getByLabel("Statut de Guide visible")).toHaveValue("draft");

  await page.getByLabel("Statut de Guide visible").selectOption("published");
  const enabled = await page.request.patch(
    "/api/admin/calculators/calculator-ranking",
    { data: { active: true } },
  );
  expect(enabled.status()).toBe(200);
});
