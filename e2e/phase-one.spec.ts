import { expect, test, type Page } from "@playwright/test";
import * as OTPAuth from "otpauth";

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

test("the legal page renders the seeded Markdown and its placeholders", async ({
  page,
}) => {
  await page.goto("/legal");
  await expect(
    page.getByRole("heading", { name: "Mentions légales", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Développement et fiabilité des données",
      level: 2,
    }),
  ).toBeVisible();
  await expect(page.getByText("[NOM DE L'ÉDITEUR — À COMPLÉTER]")).toHaveCount(
    2,
  );
  await expect(
    page.getByText("[ADRESSE EMAIL DE CONTACT — À COMPLÉTER]"),
  ).toBeVisible();
  await expect(
    page.getByText("[NOM DE L'HÉBERGEUR — À COMPLÉTER]"),
  ).toBeVisible();
});

test("the legal notice admin reuses the live Markdown workspace", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/content");
  await page.getByLabel("Markdown").fill("## Aperçu légal partagé");
  await expect(
    page.locator(".w-md-editor-preview").getByRole("heading", {
      name: "Aperçu légal partagé",
    }),
  ).toBeVisible();
});

test("the admin tools table shows categories, hides Edit for Stuff, and shares one Villes editor", async ({
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
  await page.goto("/admin/tools");

  // Point 2: the Ranking tool must display as "Classement" in French.
  await expect(
    page.locator("td.font-medium", { hasText: "Classement" }),
  ).toBeVisible();
  await expect(
    page.locator("td.font-medium", { hasText: "Ranking" }),
  ).toHaveCount(0);

  // Point 5: a Catégorie column sits next to the tool name.
  await expect(
    page.getByRole("columnheader", { name: "Catégorie" }),
  ).toBeVisible();
  const cityCostRow = page.getByRole("row", { name: "Coût de Ville" });
  await expect(cityCostRow.getByRole("cell", { name: "Villes" })).toBeVisible();

  // Point 4: the 3 Villes simulators share the same edit destination.
  for (const tool of [
    "Coût de Ville",
    "Niveau Max Atteignable",
    "Production",
  ]) {
    await expect(
      page
        .getByRole("row", { name: tool })
        .getByRole("link", { name: "Modifier" }),
    ).toHaveAttribute("href", "/admin/tools/city-parameters");
  }

  // Bloc 31/B: the Combat Equipment Comparator is removed entirely — no
  // row, no route, nothing left to assert here.
  await expect(page.getByRole("row", { name: /Comparateur/ })).toHaveCount(0);

  // Bloc 31/A + C: Compétences tools show plain labels (no "Simulateur"),
  // in the confirmed Combat, Expedition, Gems, Templars order.
  const toolLabels = await page.locator("td.font-medium").allTextContents();
  const competencesLabels = [
    "Équipement de Combat",
    "Équipements d’Expédition",
    "Gemmes",
    "Templiers",
  ];
  expect(
    toolLabels.filter((label) => competencesLabels.includes(label)),
  ).toEqual(competencesLabels);

  // Point 1: the old "Textes multilingues" editor is gone entirely — its
  // route now 404s instead of rendering an empty/dead block.
  const response = await page.goto("/admin/tools/calculator-gems");
  expect(response?.status()).toBe(404);
});

test("tool routes alone expose persistent player settings", async ({
  page,
}) => {
  await page.goto("/");
  // Bloc 91/E2: the homepage inherits the brand default title; every other
  // page gets "<title> | ML-Helper · Million Lords" via the root template.
  await expect(page).toHaveTitle("ML-Helper — Outils et guides Million Lords");
  await expect(page.getByPlaceholder("Rechercher")).toBeVisible();
  // Bloc 34/D: the carousel/hero is gone — a short intro sentence in its
  // place, the tool category grid as the actual homepage content.
  await expect(page.locator(".home-carousel")).toHaveCount(0);
  await expect(page.locator(".home-intro p")).toHaveText(
    "ML Helper réunit les outils et référentiels de la communauté pour préparer chaque décision de jeu sur Million Lords.",
  );
  // Bloc 91/E5: the homepage now opens on a real <h1> (it previously had
  // none — the intro was a bare <p>, breaking the heading hierarchy).
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Outils et guides Million Lords",
    }),
  ).toBeVisible();
  // Bloc 33/A: the homepage gives 1-click access to a tool category
  // directly (the same ToolCategoryGrid as /tools).
  await expect(page.getByRole("link", { name: /Villes/ })).toHaveAttribute(
    "href",
    new RegExp("/tools/villes$"),
  );
  // Bloc 34/E: the most recent guides + the built references are directly
  // clickable from the homepage, no detour via /guides.
  await expect(
    page.getByRole("link", { name: /Guide visible/ }),
  ).toHaveAttribute("href", new RegExp("/guides/guide-visible$"));
  await expect(page.getByRole("link", { name: /Templiers/ })).toHaveAttribute(
    "href",
    new RegExp("/referentiels/templars$"),
  );
  const publicThemeToggle = page.getByRole("button", {
    name: "Activer le mode clair",
  });
  await expect(publicThemeToggle).toHaveText("☀");
  await publicThemeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // Bloc 48/C: the public switcher is now a custom ARIA listbox (button
  // trigger + role="listbox" popup), not a native <select>.
  await page.getByRole("button", { name: /Language|Langue/ }).click();
  await page
    .getByRole("listbox", { name: /Language|Langue/ })
    .getByRole("option", { name: "EN" })
    .click();
  await expect(page.locator(".home-intro p")).toHaveText(
    "ML Helper brings together the community's tools and references to help you plan every decision in Million Lords.",
  );
  await page.goto("/guides");
  await expect(page).toHaveTitle("Guides | ML-Helper · Million Lords");
  await expect(
    page.getByRole("heading", { name: "Visible guide" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Language|Langue/ }).click();
  await page
    .getByRole("listbox", { name: /Language|Langue/ })
    .getByRole("option", { name: "FR" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guide visible" }),
  ).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);

  await page.goto("/tools");
  await expect(page).toHaveTitle("Outils | ML-Helper · Million Lords");
  await expect(page.locator(".tool-category-card")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Combat" })).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "Combat" })
      .locator("..")
      .getByText("2 outils disponibles"),
  ).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Catégories de simulateurs" }),
  ).toHaveCount(0);
  // Bloc 33/E: the whole tile is the link now — no more redundant "Ouvrir
  // la catégorie" text to click on.
  await page.getByRole("link", { name: /^Villes/ }).click();
  await expect(page).toHaveURL(/\/tools\/villes$/);
  await expect(page).toHaveTitle("Villes | ML-Helper · Million Lords");
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
  await expect(page).toHaveTitle(
    "Guides — Guide visible | ML-Helper · Million Lords",
  );
  // Bloc 91/E3: a guide is an Open Graph article with its publish time.
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "article",
  );
  await expect(
    page.locator('meta[property="article:published_time"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Guide visible" }),
  ).toBeVisible();
  await expect(
    page.getByText("Paramètres du joueur", { exact: true }),
  ).toHaveCount(0);
});

test("the clan temple bonus adds the confirmed base to the entered contribution", async ({
  page,
}) => {
  await page.goto("/tools/villes");
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  await page.getByText("Bonus de temple (clan)", { exact: true }).click();

  const line2 = page.getByTestId("player-summary-line2");
  // No clan contribution entered yet: only the confirmed temple base (50%
  // for Vitesse) shows up in the total.
  await expect(line2).toContainText("Vit 50% (0% + 0% + 50%)");

  await page
    .getByRole("spinbutton", { name: "Temple Vitesse", exact: true })
    .fill("260");
  await expect(page.getByTestId("clan-temple-total-rusher")).toHaveText("310%");
  await expect(line2).toContainText("Vit 310% (0% + 0% + 310%)");
});

test("the résumé splits 5/5 on a desktop viewport and reads at WCAG AA in light theme", async ({
  page,
}) => {
  // Point 2: a wide desktop viewport — not just mobile/tablet — must still
  // split the skill summary 5/5 across two rows instead of one scrollable
  // line.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tools/villes");
  await page.getByText("Paramètres du joueur", { exact: true }).click();

  const groups = page.locator(".player-summary-skill-group");
  await expect(groups).toHaveCount(2);
  const [firstBox, secondBox] = await Promise.all([
    groups.nth(0).boundingBox(),
    groups.nth(1).boundingBox(),
  ]);
  expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height / 2);

  // Point 1: in light theme, the résumé's total color must meet WCAG AA
  // (>= 4.5:1) against the panel background — asserted here as the exact
  // raised color, with the ratio itself covered by
  // responsive-styles.test.ts.
  await page.getByRole("button", { name: /Activer le mode clair/ }).click();
  const totalColor = await page
    .locator(".player-summary-line2 .sk-value")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(totalColor).toBe("rgb(143, 50, 16)");
});

test("Combat tools cover XP modes and demo league bands", async ({ page }) => {
  await page.goto("/tools/combat");
  await expect(page.getByTestId(/xp-range-/)).toHaveCount(5);
  await page.getByRole("spinbutton", { name: "Ma VP" }).fill("1");
  await expect(page.getByTestId("xp-range-0")).toHaveText("< 400k");
  await page.getByRole("tab", { name: "Je suis la cible" }).click();
  await expect(page.getByTestId("xp-range-200")).toHaveText("< 500k");
  await page.getByRole("tab", { name: "Troupes en attaque démo" }).click();
  // Bloc 68/J: the league <select> is replaced by single-select buttons.
  const demoLeagueGroup = page.getByRole("group", {
    name: "Ligue de l’attaquant",
  });
  const demoLeagueLabels: Record<string, string> = {
    bronze: "Bronze",
    silver: "Argent",
    gold: "Or",
    diamond: "Diamant",
  };
  for (const [league, expected] of [
    ["bronze", "70"],
    ["silver", "35"],
    ["gold", "28"],
    ["diamond", "21"],
  ]) {
    await demoLeagueGroup
      .getByRole("button", { name: demoLeagueLabels[league] })
      .click();
    await expect(page.getByTestId("demo-troops")).toHaveText(expected);
  }
});

// Bloc 67: renamed from "Level Up" to "Progression" — the URL itself is
// unchanged (/referentiels/level-up), only the displayed label.
test("Progression is a Référentiels reference and keeps Silver unconfirmed", async ({
  page,
}) => {
  await page.goto("/referentiels/level-up");
  await expect(
    page.getByRole("heading", { name: "Progression" }),
  ).toBeVisible();
  // Bloc 61/A: the league <select> is replaced by single-select buttons —
  // same visual/interaction pattern as the equipment family filters.
  const leagueGroup = page.getByRole("group", { name: "Ligue" });
  const leagueLabels: Record<string, string> = {
    bronze: "Bronze",
    silver: "Argent",
    gold: "Or",
    platinum: "Platine",
    diamond: "Diamant",
    legend: "Légende",
  };
  for (const league of ["bronze", "gold", "platinum", "diamond", "legend"]) {
    await leagueGroup
      .getByRole("button", { name: leagueLabels[league] })
      .click();
    await expect(page.getByRole("table").first()).toBeVisible();
  }
  await leagueGroup.getByRole("button", { name: "Argent" }).click();
  await expect(page.getByRole("status")).toContainText("non encore confirmée");
  await expect(page.getByRole("table")).toHaveCount(0);
  // Bloc 91/M6: an unknown tool slug now renders the translated custom 404
  // (was Next's English default, whose title matched /404|Not Found/).
  const levelUpResponse = await page.goto("/tools/level-up");
  expect(levelUpResponse?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" }),
  ).toBeVisible();
});

test("calculator pages only repeat names in their navigation tabs", async ({
  page,
}) => {
  for (const slug of ["villes", "classement", "competences"]) {
    await page.goto(`/tools/${slug}`);
    await expect(page.locator("main > .lead")).toHaveCount(0);
    // Bloc 91/M5: the calculators now carry section-level <h2> titles (fixing
    // the old h1→h3 skip under the sr-only page <h1>). Those are section names
    // — never a repeat of the tool's own name, which stays in the nav tabs.
    const tabNames = (await page.getByRole("tab").allInnerTexts()).map((name) =>
      name.trim(),
    );
    for (const heading of await page.locator("main h2").allInnerTexts()) {
      expect(tabNames).not.toContain(heading.trim());
    }
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
  // Bloc 68/K: the league <select> is replaced by single-select buttons.
  const cityLeagueGroup = page
    .locator(".city-calculators")
    .getByRole("group", { name: "Ligue" });
  await expect(
    cityLeagueGroup.getByRole("button", { name: "Légende" }),
  ).toHaveAttribute("aria-pressed", "false");
  await cityLeagueGroup.getByRole("button", { name: "Légende" }).click();
  // Bloc 33/C: "city-cost-one" was merged into the single "Total" block's
  // "city-cost-total" testid (cityCount defaults to 1, same figure).
  await expect(page.getByTestId("city-cost-total")).toHaveText("10 or");

  // Bloc 34/C: the target-level floor is enforced on blur/commit, not on
  // every keystroke — typing "100" over a min-2 field must not reset to
  // "2" after the leading "1".
  const startLevelField = page.getByRole("spinbutton", {
    name: "Niveau de départ",
  });
  const targetLevelField = page.getByRole("spinbutton", {
    name: "Niveau cible",
  });
  await startLevelField.fill("12");
  await startLevelField.blur();
  await expect(targetLevelField).toHaveValue("13");
  await targetLevelField.fill("100");
  await expect(targetLevelField).toHaveValue("100");
  await targetLevelField.fill("8");
  await expect(targetLevelField).toHaveValue("8");
  await targetLevelField.blur();
  await expect(targetLevelField).toHaveValue("13");

  await page.getByRole("tab", { name: "Niveau Max Atteignable" }).click();
  await page
    .locator(".city-calculators")
    .getByRole("group", { name: "Ligue" })
    .getByRole("button", { name: "Légende" })
    .click();
  await page.getByRole("spinbutton", { name: "Or disponible" }).fill("0.044");
  await expect(page.getByTestId("max-level-result")).toHaveText("4");

  await page.getByRole("tab", { name: "Production", exact: true }).click();
  await page
    .locator(".city-calculators")
    .getByRole("group", { name: "Ligue" })
    .getByRole("button", { name: "Légende" })
    .click();
  await expect(page.getByText("Or — Production totale")).toBeVisible();
  await expect(page.getByTestId("full-production-gold")).toHaveText("200/h");
});

test("Récompenses de Production is a standalone Villes calculator with no shared league", async ({
  page,
}) => {
  await page.goto("/tools/villes");
  await page.getByRole("tab", { name: "Récompenses de Production" }).click();
  await expect(
    page.locator(".city-calculators").getByRole("combobox", { name: "Ligue" }),
  ).toHaveCount(0);

  await page
    .getByRole("spinbutton", { name: "Production d’or de base" })
    .fill("2");
  await page.getByLabel("Unité de production d’or").selectOption("1000");
  await page.getByRole("spinbutton", { name: "Heures Or reçues" }).fill("5");
  const goldBonus = page
    .getByText("Bonus Or obtenu")
    .locator("xpath=ancestor::div[contains(@class,'calculator-stat')]")
    .locator("strong");
  await expect(goldBonus).toHaveText("10k");

  await page
    .getByRole("spinbutton", { name: "Production de troupes de base" })
    .fill("4");
  await page
    .getByLabel("Unité de production de troupes")
    .selectOption("1000000");
  await page
    .getByRole("spinbutton", { name: "Heures Troupes reçues" })
    .fill("2");
  const troopsBonus = page
    .getByText("Bonus Troupes obtenu")
    .locator("xpath=ancestor::div[contains(@class,'calculator-stat')]")
    .locator("strong");
  await expect(troopsBonus).toHaveText("8M");
  await expect(goldBonus).toHaveText("10k");
});

test("all three City tools use all six confirmed league multipliers", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const leagueCases = [
    ["bronze", "130", "52", "100/h", "40/h"],
    ["silver", "163", "59", "125/h", "45/h"],
    ["gold", "228", "72", "175/h", "55/h"],
    ["platinum", "228", "72", "175/h", "55/h"],
    ["diamond", "260", "78", "200/h", "60/h"],
    ["legend", "260", "78", "200/h", "60/h"],
  ] as const;

  // Bloc 68/F: the Player Settings league field is a button group now,
  // not a <select>.
  const playerLeagueLabels: Record<string, string> = {
    bronze: "Bronze",
    silver: "Argent",
    gold: "Or",
    platinum: "Platine",
    diamond: "Diamant",
    legend: "Légende",
  };

  await page.goto("/tools/villes");
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  const playerLeagueGroup = page
    .locator(".player-settings")
    .getByRole("group", { name: "Ligue" });
  for (const [
    league,
    boostedGold,
    boostedArmy,
    baseGold,
    baseArmy,
  ] of leagueCases) {
    await playerLeagueGroup
      .getByRole("button", { name: playerLeagueLabels[league] })
      .click();

    await page.getByRole("tab", { name: "Coût de Ville" }).click();
    await expect(page.getByTestId("city-cost-gold")).toContainText(
      `${boostedGold} →`,
    );
    await expect(page.getByTestId("city-cost-army")).toContainText(
      `${boostedArmy} →`,
    );

    await page.getByRole("tab", { name: "Niveau Max Atteignable" }).click();
    await expect(page.getByTestId("city-max-level-gold")).toHaveText(
      `${boostedGold} → ${boostedGold}`,
    );
    await expect(page.getByTestId("city-max-level-army")).toHaveText(
      `${boostedArmy} → ${boostedArmy}`,
    );

    await page.getByRole("tab", { name: "Production", exact: true }).click();
    await expect(page.getByTestId("city-production-gold")).toHaveText(baseGold);
    await expect(page.getByTestId("city-production-army")).toHaveText(baseArmy);
  }
});

test("dependent league selectors sync once and preserve manual choices", async ({
  page,
}) => {
  await page.goto("/tools/villes");
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  // Bloc 68/F+K: both the Player Settings and the city calculators' league
  // fields are button groups now, not <select> elements — assert via
  // aria-pressed instead of the field's value.
  const playerLeagueGroup = page
    .locator(".player-settings")
    .getByRole("group", { name: "Ligue" });
  const cityLeagueGroup = page
    .locator(".city-calculators")
    .getByRole("group", { name: "Ligue" });

  for (const button of await playerLeagueGroup.getByRole("button").all())
    await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(
    cityLeagueGroup.getByRole("button", { name: "Diamant" }),
  ).toHaveAttribute("aria-pressed", "false");
  await playerLeagueGroup.getByRole("button", { name: "Diamant" }).click();
  await expect(
    cityLeagueGroup.getByRole("button", { name: "Diamant" }),
  ).toHaveAttribute("aria-pressed", "true");

  await cityLeagueGroup.getByRole("button", { name: "Or" }).click();
  await playerLeagueGroup.getByRole("button", { name: "Légende" }).click();
  await expect(
    cityLeagueGroup.getByRole("button", { name: "Or" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Niveau Max Atteignable" }).click();
  await expect(
    page
      .locator(".city-calculators")
      .getByRole("group", { name: "Ligue" })
      .getByRole("button", { name: "Légende" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Ranking converts position and percentage into league ranges", async ({
  page,
}) => {
  await page.goto("/tools/classement");
  await expect(page.getByRole("link", { name: "Classement" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Bloc 61/B: the league <select> is replaced by single-select buttons.
  const rankingLeagueGroup = page
    .locator(".ranking-calculator")
    .getByRole("group", { name: "Ligue" });
  await rankingLeagueGroup.getByRole("button", { name: "Diamant" }).click();
  await expect(page.getByTestId("ranking-total")).toHaveText("1 000");
  await expect(
    page.getByLabel("Échelle de classement de 100% à 0%"),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Descente Platine" }),
  ).toBeVisible();

  // Bloc61/B: at a standard desktop width, the league buttons, the %
  // field and the rank field must sit on a single row — checked by their
  // vertical ranges overlapping (same row) and the buttons sitting to the
  // left of both fields (reading order), rather than a fragile exact-y
  // comparison (the unlabeled button group and the labeled fields have
  // different heights, so their tops don't align pixel-for-pixel).
  const groupBox = await rankingLeagueGroup.boundingBox();
  const percentageBox = await page
    .getByRole("spinbutton", { name: "Ton pourcentage actuel" })
    .boundingBox();
  const rankBox = await page
    .getByRole("spinbutton", { name: "Ton rang actuel" })
    .boundingBox();
  expect(groupBox).not.toBeNull();
  expect(percentageBox).not.toBeNull();
  expect(rankBox).not.toBeNull();
  const overlapsVertically = (
    a: { y: number; height: number },
    b: { y: number; height: number },
  ) => Math.max(a.y, b.y) < Math.min(a.y + a.height, b.y + b.height);
  expect(overlapsVertically(groupBox!, percentageBox!)).toBe(true);
  expect(overlapsVertically(groupBox!, rankBox!)).toBe(true);
  expect(groupBox!.x + groupBox!.width).toBeLessThan(percentageBox!.x);
  expect(percentageBox!.x + percentageBox!.width).toBeLessThan(rankBox!.x);

  await rankingLeagueGroup.getByRole("button", { name: "Bronze" }).click();
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
  // Bloc 53/E: the link's accessible name is now the destination
  // reference's own title, not a generic "Voir le référentiel complet".
  await expect(
    page.getByRole("link", { name: "Équipements de Combat" }),
  ).toHaveAttribute("href", new RegExp("/referentiels/combat-equipment$"));

  await page.getByRole("tab", { name: "Gemmes" }).click();
  // Bloc 36/A: same cross-link pattern already verified for Templiers below.
  await expect(
    page.getByRole("main").getByRole("link", { name: "Gemmes" }),
  ).toHaveAttribute("href", new RegExp("/referentiels/gems$"));
  await page.getByRole("tab", { name: "Budget disponible" }).click();
  // Bloc 82/D: no skill pre-selected any more — pick one explicitly.
  await page
    .getByRole("combobox", { name: "Compétence" })
    .selectOption("fearless");
  await page
    .locator(".city-calculators")
    .getByRole("combobox", { name: "Ligue" })
    .selectOption("legend");
  await page.getByRole("spinbutton", { name: "Emplacements budget" }).fill("3");
  await page
    .getByRole("spinbutton", { name: "Budget disponible en saphirs" })
    .fill("112000");
  await expect(page.getByTestId("gem-budget-distribution")).toContainText(
    "1 gemme 4★ + 2 gemmes 3★",
  );

  await page.getByRole("tab", { name: "Templiers" }).click();
  await expect(page.getByRole("link", { name: /Templiers$/ })).toHaveAttribute(
    "href",
    new RegExp("/referentiels/templars$"),
  );
  await page.getByRole("spinbutton", { name: "Niveau cible" }).fill("3");
  await expect(page.getByTestId("templar-cost")).toHaveText("599 Pouciel");
  // Point 1: one shared level range applies to all 5 skills at once.
  // Bloc 68/C: results are now tiles (same pattern as the Templiers
  // referentiel), not table rows.
  const rusherTile = page.getByTestId("templars-calculator-tile-rusher");
  await expect(rusherTile).toContainText("Bonus par Templier : 1%");
  // Bloc 70/B: shortened labels — no more target-level mention in
  // "Bonus total", and "Gain" instead of "Gain départ → cible".
  await expect(rusherTile).toContainText("Bonus total : 3%");
  await expect(rusherTile).toContainText("Gain : +3%");
  await page.getByRole("spinbutton", { name: "Niveau de départ" }).fill("1");
  await expect(rusherTile).toContainText("Gain : +2%");
});

test("Reference tables filter combat and expedition equipment", async ({
  page,
}) => {
  // Bloc 50/1b: /referentiels is now an independent root, split off from
  // /guides — the reference catalog no longer renders on the guides hub at
  // all (only the guides list does), so this checks each root separately.
  // Bloc 53/D: /guides' h1 now reuses the homepage's own guides intro
  // title ("Affûte ta stratégie"), not the short "Guides" index title.
  await page.goto("/guides");
  await expect(
    page.getByRole("heading", {
      name: "Affûte ta stratégie",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();

  await page.goto("/referentiels");
  // Bloc 52/B: the section-nav banner no longer renders on the index page
  // (only on a specific reference's page) — scoped to the catalog grid
  // regardless, since that's the only place these links live here.
  const referentielsGrid = page.locator(".tool-category-grid");
  await expect(
    referentielsGrid.getByRole("link", { name: /Équipements de Combat/ }),
  ).toHaveAttribute("href", new RegExp("/referentiels/combat-equipment$"));
  await expect(
    referentielsGrid.getByRole("link", { name: /Équipements d’Expédition/ }),
  ).toHaveAttribute("href", new RegExp("/referentiels/expedition-equipment$"));

  await page.goto("/referentiels/combat-equipment");
  // Bloc 39: table rows became tiles grouped into per-set blocks — no
  // star-level selector any more (tiles always show the base 1★ value).
  // Bloc 40/D-F: family/rarity filters are back to a real hide-filter (both
  // start fully selected) — deselecting a family removes its sets from the
  // page instead of just dimming them.
  await expect(
    page.getByRole("combobox", { name: "Niveau d’étoile" }),
  ).toHaveCount(0);
  const attaqueBlock = page.locator(".reference-tile-block", {
    hasText: "Spirit Fyra",
  });
  const orBlock = page.locator(".reference-tile-block", {
    hasText: "Spirit Fulgur",
  });
  await expect(attaqueBlock).toBeVisible();
  await expect(orBlock).toBeVisible();
  // Bloc 42/I: data-testid instead of the visible label — this filter row
  // was redesigned once already (Bloc 39, rows to tiles) and a label-text
  // selector would also break the moment "Or" gets translated per-locale.
  await page.getByTestId("filter-family-Or").click();
  await expect(attaqueBlock).toBeVisible();
  await expect(orBlock).toHaveCount(0);
  await expect(attaqueBlock.getByText("10%").first()).toBeVisible();

  await page.goto("/referentiels/expedition-equipment");
  // All 10 expedition stats are confirmed (Bloc 29): no more stale
  // "unconfirmed assumption" banner on this page.
  await expect(page.getByText(/projection par étoile est une/)).toHaveCount(0);
  await expect(page.getByText("Hypothèse non confirmée")).toHaveCount(0);

  await page.goto("/tools/referentiels");
  await expect(page).toHaveURL(/\/referentiels$/);
});

test("a super admin signs in, creates an admin, and sees the audit log", async ({
  page,
}) => {
  test.setTimeout(120_000);
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
  await expect(page.getByText(/\d+ activés \/ \d+ au total/)).toHaveCount(2);
  await expect(page.getByText(/\d+ publiés \/ \d+ au total/)).toBeVisible();
  await expect(page.getByText(/\d+ actifs \/ \d+ au total/)).toBeVisible();
  // Bloc 50: the admin nav now also has a "Référentiels" link, so this must
  // be scoped to the dashboard's content-status widget to stay unambiguous.
  await expect(
    page
      .getByLabel("État des contenus")
      .getByText("Référentiels", { exact: true }),
  ).toBeVisible();
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

  // Bloc 50 (2): reference rows (Combat/Expedition/Level-up/Templiers/
  // Gemmes/Boutique) live on the separate Référentiels admin screen now,
  // not on Guides.
  await adminNav.getByRole("link", { name: "Référentiels" }).click();
  await page
    .getByRole("row", { name: /Équipements de Combat/ })
    .getByRole("link", { name: "Éditer" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Éditer les Équipements de Combat",
    }),
  ).toBeVisible({ timeout: 15_000 });
  // Bloc 35/6.1: the page also renders the Pouciel/gem-slots-per-rarity
  // editors alongside the main table — Bloc 41/D moved them ahead of it, so
  // scope to the last table (the main one) rather than every tbody row on
  // the page.
  await expect(page.locator("table").last().locator("tbody tr")).toHaveCount(
    180,
    { timeout: 15_000 },
  );
  await expect(page.getByLabel("Ligne 1 Nom du set")).not.toHaveValue("");

  await adminNav.getByRole("link", { name: "Référentiels" }).click();
  await page
    .getByRole("row", { name: /Équipements d’Expédition/ })
    .getByRole("link", { name: "Éditer" })
    .click();
  // The page also renders the (single-row) star-increments editor above
  // this table (Bloc 29/A), so scope to the last table on the page rather
  // than every tbody row.
  await expect(page.locator("table").last().locator("tbody tr")).toHaveCount(
    120,
  );
  await expect(
    page.getByLabel("Expédition ligne 1 Nom du set"),
  ).not.toHaveValue("");
  // Regression check: Bloc 37/E replaced this page's per-table save
  // buttons with a single top action bar that saves every table (star
  // increments, merge-cost, dismantle, main reference) in one click — edit
  // two of them and confirm one save persists both, not just the last one
  // touched.
  await page.getByLabel("Ligne 1 Or").fill("0.5");
  const mergeCostSection = page.locator(".editable-reference").nth(1);
  await mergeCostSection.getByLabel("Ligne 1 Commun").fill("700");
  await page.getByRole("button", { name: "Enregistrer toute la page" }).click();
  // Wait for the async save to actually complete before reloading, or the
  // reload can race ahead of the PUT requests and read back stale defaults.
  await expect(page.getByText("Référentiel enregistré.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Ligne 1 Or")).toHaveValue("0.5");
  await expect(
    page.locator(".editable-reference").nth(1).getByLabel("Ligne 1 Commun"),
  ).toHaveValue("700");

  await adminNav.getByRole("link", { name: "Référentiels" }).click();
  // Bloc 30: Templars has no lookup_table of its own — its reference row
  // must open the same TemplarParametersEditor as the calculator tool
  // (cdc section 6, décision Bloc 3), not a dead or separate screen.
  // Bloc 33/G: the reference now has its own independent active flag (a
  // dedicated Calculator row, distinct from the Templars tool's own) —
  // toggling it here must not affect the public Templars tool at all.
  const templarsGuideRow = page.getByRole("row", { name: /Templiers/ });
  await templarsGuideRow.getByRole("button", { name: "Désactiver" }).click();
  await expect(templarsGuideRow).toContainText("Inactif");
  await page.goto("/tools/competences");
  await expect(page.getByRole("tab", { name: "Templiers" })).toBeEnabled();
  await page.goto("/admin/referentiels");
  const templarsGuideRowAfterReload = page.getByRole("row", {
    name: /Templiers/,
  });
  await templarsGuideRowAfterReload
    .getByRole("button", { name: "Activer" })
    .click();
  await expect(templarsGuideRowAfterReload).toContainText("Actif");
  await templarsGuideRowAfterReload
    .getByRole("link", { name: "Éditer" })
    .click();
  // Bloc 35/7.1, updated Bloc 50: opened from the Référentiels admin row, so
  // the URL carries ?from=referentiels — the editor's own "Retour" now goes
  // back to Référentiels, not Tools, for this exact same shared edit point.
  await expect(page).toHaveURL(/\/admin\/tools\/templars\?from=referentiels$/);
  await expect(
    page.locator(".editor-action-bar").getByRole("link", { name: "← Retour" }),
  ).toHaveAttribute("href", "/admin/referentiels");
  await expect(
    page.getByRole("heading", { name: "Paramètres de coût des Templiers" }),
  ).toBeVisible();
  // Bloc 66/B: exact match — the presentation editor sharing this page now
  // also carries 5 editable "Base Temple N" fields (Bloc 68/C), whose
  // accessible names otherwise substring-match this same "Base" locator.
  await page.getByRole("spinbutton", { name: "Base", exact: true }).fill("200");
  await page
    .locator(".editor-action-bar")
    .getByRole("button", { name: "Enregistrer les paramètres" })
    .click();
  await expect(
    page.locator(".editor-action-bar").getByRole("status"),
  ).toHaveText("Paramètres enregistrés.", { timeout: 15_000 });
  // Single shared data source (cdc section 6): the same edit reaches both
  // the public reference and the Templars calculator.
  await page.goto("/referentiels/templars");
  await expect(page.locator("tbody tr").first()).toContainText("200");
  await page.goto("/tools/competences");
  await page.getByRole("tab", { name: "Templiers" }).click();
  await expect(page.getByTestId("templar-cost")).toContainText("200");

  // Bloc 36/A: same independent-active-flag + shared-editor pattern as
  // Templiers just above, for the new Gemmes reference.
  await page.goto("/admin/referentiels");
  const gemmesGuideRow = page.getByRole("row", { name: /Gemmes/ });
  await gemmesGuideRow.getByRole("button", { name: "Désactiver" }).click();
  await expect(gemmesGuideRow).toContainText("Inactif");
  await page.goto("/tools/competences");
  await expect(page.getByRole("tab", { name: "Gemmes" })).toBeEnabled();
  await page.goto("/admin/referentiels");
  const gemmesGuideRowAfterReload = page.getByRole("row", { name: /Gemmes/ });
  await gemmesGuideRowAfterReload
    .getByRole("button", { name: "Activer" })
    .click();
  await expect(gemmesGuideRowAfterReload).toContainText("Actif");
  await gemmesGuideRowAfterReload.getByRole("link", { name: "Éditer" }).click();
  await expect(page).toHaveURL(/\/admin\/tools\/gems\?from=referentiels$/);
  await expect(
    page.locator(".editor-action-bar").getByRole("link", { name: "← Retour" }),
  ).toHaveAttribute("href", "/admin/referentiels");
  await expect(
    page.getByRole("heading", { name: "Paramètres des Gemmes" }),
  ).toBeVisible();

  await page.goto("/admin");
  await adminNav.getByRole("link", { name: "Outils" }).click();
  await page
    .getByRole("row", { name: /Templiers/ })
    .getByRole("link", { name: "Modifier" })
    .click();
  // Base was changed to 200 above, from the Guides admin reference row —
  // same shared parameters, reached from either admin table. Exact match:
  // see the earlier comment on the same collision with the presentation
  // editor's editable "Base Temple N" fields.
  await expect(
    page.getByRole("spinbutton", { name: "Base", exact: true }),
  ).toHaveValue("200");
  await expect(page.getByRole("spinbutton", { name: "Ratio" })).toHaveValue(
    "1.3",
  );
  const toolActionBar = page.locator(".editor-action-bar");
  await expect(
    toolActionBar.getByRole("link", { name: "← Retour" }),
  ).toBeVisible();
  await expect(
    toolActionBar.getByRole("button", { name: "Enregistrer les paramètres" }),
  ).toBeVisible();
  await toolActionBar
    .getByRole("button", { name: "Enregistrer les paramètres" })
    .click();
  await expect(toolActionBar.getByRole("status")).toHaveText(
    "Paramètres enregistrés.",
    { timeout: 15_000 },
  );

  await adminNav.getByRole("link", { name: "Outils" }).click();
  await page
    .getByRole("row", { name: /Taux de gain d’XP/ })
    .getByRole("link", { name: "Modifier" })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Seuil haut du palier 1" }),
  ).toHaveValue("40");
  await expect(page.getByText("∞")).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Taux XP du palier 3" })
    .fill("110");
  await page
    .locator(".editor-action-bar")
    .getByRole("button", { name: "Enregistrer les paramètres" })
    .click();
  await expect(
    page.locator(".editor-action-bar").getByRole("status"),
  ).toHaveText("Paramètres enregistrés.", { timeout: 15_000 });

  await adminNav.getByRole("link", { name: "Outils" }).click();
  await page
    .getByRole("row", { name: /Troupes en attaque démo/ })
    .getByRole("link", { name: "Modifier" })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Bronze X (% des remparts)" }),
  ).toHaveValue("100");
  await page
    .getByRole("spinbutton", { name: "Or X (% des remparts)" })
    .fill("45");
  await page
    .locator(".editor-action-bar")
    .getByRole("button", { name: "Enregistrer les paramètres" })
    .click();
  await expect(
    page.locator(".editor-action-bar").getByRole("status"),
  ).toHaveText("Paramètres enregistrés.", { timeout: 15_000 });

  await adminNav.getByRole("link", { name: "Outils" }).click();
  await page
    .getByRole("row", { name: /Gemmes/ })
    .getByRole("link", { name: "Modifier" })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Vitesse · Légende" }),
  ).toHaveValue("15");
  await page.getByRole("spinbutton", { name: "Prix Légende" }).fill("5000");
  await page
    .locator(".editor-action-bar")
    .getByRole("button", { name: "Enregistrer les paramètres" })
    .click();
  await expect(
    page.locator(".editor-action-bar").getByRole("status"),
  ).toHaveText("Paramètres enregistrés.", { timeout: 15_000 });
});

test("deactivating a user blocks sign-in until reactivated", async ({
  browser,
}) => {
  const rootContext = await browser.newContext();
  const root = await rootContext.newPage();
  await root.goto("/login");
  await root.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await root
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await root.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(root).toHaveURL(/\/admin$/);

  const created = await root.request.post("/api/admin/users", {
    data: {
      username: "togglable-user",
      role: "read_only",
      password: "toggle-user-password",
    },
  });
  expect(created.status()).toBe(201);

  await root.goto("/admin/users");
  const row = root.getByRole("row", { name: /togglable-user/ });
  await expect(row.getByText("Actif")).toBeVisible();
  await row.getByRole("button", { name: "Désactiver" }).click();
  await expect(root.getByRole("status")).toHaveText("Utilisateur désactivé");
  await expect(row.getByText("Désactivé")).toBeVisible();

  const disabledContext = await browser.newContext();
  const disabledPage = await disabledContext.newPage();
  await disabledPage.goto("/login");
  await disabledPage.getByLabel(/Username|Identifiant/).fill("togglable-user");
  await disabledPage
    .getByLabel(/Password|Mot de passe/)
    .fill("toggle-user-password");
  await disabledPage
    .getByRole("button", { name: /Sign in|Se connecter/ })
    .click();
  await expect(disabledPage.locator("form").getByRole("alert")).toHaveText(
    "Compte désactivé, contacter l’administrateur.",
  );
  await expect(disabledPage).toHaveURL(/\/login$/);

  await row.getByRole("button", { name: "Activer" }).click();
  await expect(root.getByRole("status")).toHaveText("Utilisateur activé");
  await expect(row.getByText("Actif")).toBeVisible();

  await disabledPage.getByLabel(/Username|Identifiant/).fill("togglable-user");
  await disabledPage
    .getByLabel(/Password|Mot de passe/)
    .fill("toggle-user-password");
  await disabledPage
    .getByRole("button", { name: /Sign in|Se connecter/ })
    .click();
  await expect(disabledPage).toHaveURL(/\/admin$/);

  const usersList = (await (
    await root.request.get("/api/admin/users")
  ).json()) as { id: string; username: string }[];
  const selfId = usersList.find((user) => user.username === "rootadmin")?.id;
  const selfDeactivate = await root.request.patch(
    `/api/admin/users/${selfId}`,
    { data: { active: false } },
  );
  expect(selfDeactivate.status()).toBe(400);
});

test("the audit log paginates by 20 entries", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const created = await page.request.post("/api/admin/users", {
    data: {
      username: "pagination-user",
      role: "read_only",
      password: "pagination-password",
    },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  for (let i = 0; i < 25; i += 1) {
    const response = await page.request.patch(`/api/admin/users/${id}`, {
      data: { active: i % 2 === 0 },
    });
    expect(response.status()).toBe(200);
  }

  await page.goto("/admin/logs?q=pagination-user");
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await expect(page.getByText("Page 1 / 2")).toBeVisible();
  await expect(page.getByRole("link", { name: "Précédent" })).toHaveCount(0);

  await page.getByRole("link", { name: "Suivant" }).click();
  await expect(page).toHaveURL(/\/admin\/logs\?q=pagination-user&page=2$/);
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(page.getByText("Page 2 / 2")).toBeVisible();
  await expect(page.getByRole("link", { name: "Suivant" })).toHaveCount(0);

  await page.getByRole("link", { name: "Précédent" }).click();
  await expect(page).toHaveURL(/\/admin\/logs\?q=pagination-user$/);
});

// Bloc 57: the Boutique reference screen has a single save button (Bloc 42)
// that used to fire 2 separate requests (intro PATCH + rows PUT), each
// writing its own audit log row — one click produced 2 lines in
// /admin/logs instead of 1. Both writes now go through a single combined
// PUT request wrapped in one transaction with one audit log entry.
test("Bloc57/A+B: a single Boutique save produces exactly 1 audit log line, correctly named", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const saveResponse = await page.request.put(
    "/api/admin/guides/references/consumables",
    {
      // Bloc 58: the free-text markdown intro is gone — the route now takes
      // a single flat catalog object (intro + the 4 categories), each an
      // array of structured rows.
      data: {
        intro: [
          {
            image: "/consumables/sapphires.webp",
            name_fr: "Saphirs",
            name_en: "Sapphires",
            description_fr: "Introduction Boutique Bloc57",
            description_en: "Boutique Bloc57 introduction",
            cost: "",
          },
        ],
        advisors: [],
        equipment: [],
        expedition: [],
        inventory: [],
      },
    },
  );
  expect(saveResponse.ok()).toBeTruthy();

  await page.goto("/admin/logs?q=référentiel Boutique");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("cell", {
      name: /rootadmin a (créé|modifié) le référentiel Boutique/,
    }),
  ).toBeVisible();

  // No residual "Consommables" naming anywhere in the log history.
  await page.goto("/admin/logs?q=Consommables");
  await expect(
    page.getByText("Aucune entrée ne correspond aux filtres."),
  ).toBeVisible();
});

test("the dashboard's published-guides counter ignores an inactive guide", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  function publishedCount(text: string) {
    return Number(/(\d+) publiés/.exec(text)?.[1]);
  }
  const before = publishedCount(
    (await page.getByText(/\d+ publiés \/ \d+ au total/).textContent()) ?? "",
  );

  const created = await page.request.post("/api/admin/guides", {
    data: {
      slug: "dashboard-counter-guide",
      category: ["debuter"],
      coverImage: "",
      translations: {
        fr: { title: "Compteur dashboard", excerpt: "R", content: "P" },
        en: { title: "Dashboard counter", excerpt: "S", content: "P" },
      },
    },
  });
  expect(created.status()).toBe(201);
  const { id: guideId } = (await created.json()) as { id: string };
  expect(
    (
      await page.request.patch(`/api/admin/guides/${guideId}/status`, {
        data: { status: "pending_review" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.patch(`/api/admin/guides/${guideId}/status`, {
        data: { status: "published" },
      })
    ).status(),
  ).toBe(200);

  await page.goto("/admin");
  const afterPublish = publishedCount(
    (await page.getByText(/\d+ publiés \/ \d+ au total/).textContent()) ?? "",
  );
  expect(afterPublish).toBe(before + 1);

  expect(
    (
      await page.request.patch(`/api/admin/guides/${guideId}/active`, {
        data: { active: false },
      })
    ).status(),
  ).toBe(200);

  await page.goto("/admin");
  const afterDeactivate = publishedCount(
    (await page.getByText(/\d+ publiés \/ \d+ au total/).textContent()) ?? "",
  );
  expect(afterDeactivate).toBe(before);
});

// Bloc 60: the 7th reference — "Événements" (per-league personal quests).
// Ships inactive and empty; this test drives the whole path end to end:
// activates it in /admin/referentiels, adds an event with a tier in its
// admin editor (league buttons, nested EditableDataTable reuse), then
// confirms the public page renders it collapsed by default and expands on
// click — the one flow unit tests alone can't fully exercise (real
// routing, real save round-trip, real toggle).
test("Bloc60: Événements ships inactive, and the full admin add -> public collapsible flow works once activated", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Starts inactive: invisible on the public site.
  const publicBefore = await page.goto("/referentiels/events");
  await expect(
    page.getByText("Ce référentiel est temporairement indisponible."),
  ).toBeVisible();
  expect(publicBefore?.status()).toBe(200);

  // Bloc 60 review (Codex PR #81): also invisible in public discovery —
  // no dead tile on the homepage or the /referentiels index, no dead
  // search result — until an admin activates it.
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Événements/ })).toHaveCount(0);
  await page.goto("/referentiels");
  await expect(page.getByRole("link", { name: /Événements/ })).toHaveCount(0);
  await page.getByRole("searchbox").fill("événements");
  await expect(page.getByRole("link", { name: /Événements/ })).toHaveCount(0);
  await page.getByRole("searchbox").fill("");

  await page.goto("/admin/referentiels");
  const row = page.getByRole("row", { name: /Événements/ });
  await expect(row.getByText("Inactif")).toBeVisible();
  await row.getByRole("button", { name: "Activer" }).click();
  // Exact match required: getByText's default substring match would treat
  // "Inactif" itself as satisfying "Actif" (it contains that substring),
  // so a plain `getByText("Actif")` here would resolve immediately without
  // actually waiting for the toggle's fetch to land — then the next line's
  // page.goto (a hard navigation) would cancel that still-in-flight PATCH.
  await expect(row.getByText("Actif", { exact: true })).toBeVisible();

  // Bloc 60 review (Codex PR #81): now visible in public discovery too.
  await page.goto("/referentiels");
  await expect(page.getByRole("link", { name: /Événements/ })).toHaveCount(1);

  await page.goto("/admin/referentiels");
  await row.getByRole("link", { name: "Éditer" }).click();
  await expect(page).toHaveURL(/\/admin\/referentiels\/reference-events$/);

  // Bloc 61 pattern: league buttons, not a select box — Bronze by default.
  const leagueGroup = page.getByRole("group", { name: "Ligue" });
  await expect(
    leagueGroup.getByRole("button", { name: "Bronze" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("add-event-bronze").click();
  await page.getByLabel("Nom de l’événement 1").fill("Recruteur");
  await page
    .getByLabel("Description de l’événement 1")
    .fill("Enrôle des troupes pour la ligue.");
  // Bloc 79/B: buttons instead of a <select> for the fixed 3-value enum.
  await page
    .getByRole("group", { name: "Durée de l’événement 1" })
    .getByRole("button", { name: "48h" })
    .click();
  // The tier list is inside a collapsible <details>, closed by default —
  // open it before its "+" add-tier button becomes clickable.
  await page.getByText("Paliers (0)").click();
  await page.getByTestId("add-tier-bronze-0").click();
  await page
    .getByLabel("Objectif du palier 1 de Recruteur")
    .fill("1G troupes enrôlées");
  await page
    .getByLabel("Récompense du palier 1 de Recruteur")
    .fill("100M or + 250 éclats");
  // Bloc 60 review (Codex PR #81): tier text is captured per fr/en field —
  // switch the editorial locale and fill the English pair too.
  await page.getByLabel("Langue du texte").selectOption("en");
  await page
    .getByLabel("Objectif du palier 1 de Recruteur")
    .fill("1B troops enlisted");
  await page
    .getByLabel("Récompense du palier 1 de Recruteur")
    .fill("100M gold + 250 shards");
  await page.getByLabel("Langue du texte").selectOption("fr");
  await page.getByRole("button", { name: "Enregistrer toute la page" }).click();
  await expect(page.getByRole("status")).toHaveText("Référentiel enregistré.");

  // Public: entirely independent per league — Légende stays empty while
  // Bronze has the event just saved; the event is closed by default.
  await page.goto("/referentiels/events");
  await expect(page.getByRole("heading", { name: "Événements" })).toBeVisible();
  const publicLeagueGroup = page.getByRole("group", { name: "Ligue" });
  await publicLeagueGroup.getByRole("button", { name: "Légende" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Aucun événement pour cette ligue pour le moment.",
  );

  await publicLeagueGroup.getByRole("button", { name: "Bronze" }).click();
  // Bloc 79/I: the collapsible block is now a tile (details.events-tile).
  const details = page.locator("details.events-tile");
  await expect(details).toHaveCount(1);
  // Bloc 77/D: the season timeline above the tile grid also shows the
  // event's name, so scope to the tile itself rather than an ambiguous
  // page-wide getByText that would now match both.
  await expect(details.getByText("Recruteur")).toBeVisible();
  // Bloc 79/F: the description shows next to the name even closed.
  await expect(
    details.getByText("Enrôle des troupes pour la ligue."),
  ).toBeVisible();
  // Bloc 79/I: the final-tier objective + duration badges show closed too
  // (scoped to the badge classes — the same objective text also sits in
  // the, still closed, tier table below, so an unscoped getByText would
  // resolve to both and fail strict mode).
  await expect(details.locator(".events-tile-badge-objective")).toHaveText(
    "1G troupes enrôlées",
  );
  // Bloc 81/F: the duration badge now also shows the start/end days.
  await expect(details.locator(".events-tile-badge-duration")).toHaveText(
    "J0-J2 (48h)",
  );
  // ...but the tier table itself only mounts once opened.
  await expect(details.getByText("100M or + 250 éclats")).not.toBeVisible();

  await details.locator("summary").click();
  await expect(details.getByText("100M or + 250 éclats")).toBeVisible();
});

test("Bloc77 review (Codex PR #95): the admin editor blocks a save that overruns the season, and the PUT route rejects it too", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/referentiels/reference-events");
  await expect(page).toHaveURL(/\/admin\/referentiels\/reference-events$/);

  // Argent (silver), not Bronze — the earlier Bloc60 test in this same
  // suite run already added an event to Bronze, and that persists across
  // tests (same server/db), so Bronze isn't the empty league it looks like
  // in isolation.
  await page
    .getByRole("group", { name: "Ligue" })
    .getByRole("button", { name: "Argent" })
    .click();
  // Argent's season shrunk to 1 day (24h) — a single 48h event then
  // overruns it, simpler to set up than piling up several events.
  await page.getByLabel("Durée de la saison (jours)").fill("1");
  await page.getByTestId("add-event-silver").click();
  await page.getByLabel("Nom de l’événement 1").fill("Trop long");
  await page
    .getByRole("group", { name: "Durée de l’événement 1" })
    .getByRole("button", { name: "48h" })
    .click();
  await page.getByRole("button", { name: "Enregistrer toute la page" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Corrige les champs signalés avant l’enregistrement.",
  );
  await expect(
    page.getByText(
      "La durée cumulée des événements (48h) dépasse la durée de la saison (24h).",
    ),
  ).toBeVisible();

  // Defense in depth: the PUT route rejects the same overrunning shape too,
  // even sent directly (bypassing the admin editor's own client-side check).
  const response = await page.request.put(
    "/api/admin/guides/references/events",
    {
      data: {
        bronze: { seasonDurationDays: 21, events: [] },
        silver: {
          seasonDurationDays: 1,
          events: [
            {
              name: "Trop long",
              description_fr: "",
              description_en: "",
              duration: 48,
              color: "violet",
              tiers: [],
            },
          ],
        },
        gold: { seasonDurationDays: 14, events: [] },
        platinum: { seasonDurationDays: 14, events: [] },
        diamond: { seasonDurationDays: 14, events: [] },
        legend: { seasonDurationDays: 14, events: [] },
      },
    },
  );
  expect(response.status()).toBe(400);
});

test("Bloc79 review (Codex PR #96): the PUT route rejects a season duration that's fractional or past the 366-day cap", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await page
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const validLeagueData = { seasonDurationDays: 14, events: [] };
  const catalogWith = (silverSeasonDurationDays: unknown) => ({
    bronze: { seasonDurationDays: 21, events: [] },
    silver: { seasonDurationDays: silverSeasonDurationDays, events: [] },
    gold: validLeagueData,
    platinum: validLeagueData,
    diamond: validLeagueData,
    legend: validLeagueData,
  });

  // Without this cap (Bloc 79/D), the public timeline renders one tick
  // element per day of seasonDurationDays on every render — an
  // unbounded/typo'd value (or a fractional one, which would produce
  // broken day labels) must never reach storage.
  for (const invalid of [367, 2.5, 0, -1]) {
    const response = await page.request.put(
      "/api/admin/guides/references/events",
      { data: catalogWith(invalid) },
    );
    expect(response.status()).toBe(400);
  }

  const okResponse = await page.request.put(
    "/api/admin/guides/references/events",
    { data: catalogWith(366) },
  );
  expect(okResponse.status()).toBe(200);
});

test("direct admin URLs enforce all six roles", async ({ browser }) => {
  // Bloc 59: a few extra navigations/API calls were added to check the
  // admin/read_only permission fix, pushing this already-heavy test past
  // the previous 60s budget.
  test.setTimeout(120_000);
  const rootContext = await browser.newContext();
  const root = await rootContext.newPage();
  const setup = await root.request.post("/api/admin/setup", {
    data: {
      username: "rootadmin",
      password: "correct-horse-battery-staple",
    },
  });
  expect([201, 409]).toContain(setup.status());
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
    ["role-tools", "tools_manager"],
    ["role-references", "references_manager"],
    ["role-readonly", "read_only"],
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
    "/admin/referentiels",
    "/admin/tools",
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
      allowed: allSections.filter((path) => path !== "/admin/content"),
    },
    {
      username: "role-guides",
      password: "role-test-password",
      // guides_manager has no references.read post-Bloc-50 — /admin/referentiels
      // correctly stays 403 for it.
      allowed: ["/admin/guides"],
    },
    {
      username: "role-tools",
      password: "role-test-password",
      allowed: ["/admin/tools"],
    },
    {
      username: "role-references",
      password: "role-test-password",
      allowed: ["/admin/referentiels"],
    },
    {
      username: "role-readonly",
      password: "role-test-password",
      // Bloc 59/B: read_only is strictly limited to Guides/Référentiels/
      // Outils in read-only — no Historique, no Utilisateurs.
      allowed: ["/admin/guides", "/admin/referentiels", "/admin/tools"],
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
    if (roleCase.username === "role-admin") {
      // Bloc59/A: admin keeps read access to the audit log (asserted above,
      // /admin/logs is 200) but must never be able to purge it — neither
      // the button nor a direct call to the API endpoint.
      await expect(
        page.getByRole("button", { name: "Purger la plage" }),
      ).toHaveCount(0);
      const purgeAttempt = await page.request.delete("/api/admin/logs", {
        data: { start: "2020-01-01T00:00", end: "2020-01-02T00:00" },
      });
      expect(purgeAttempt.status()).toBe(403);
    }
    if (roleCase.username === "role-readonly") {
      // Bloc59/B: no indirect exposure of the audit history via the
      // dashboard's "dernières actions" section, and no nav links to the
      // two sections it can no longer reach.
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Dernières actions" }),
      ).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Historique" })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("link", { name: "Utilisateurs" }),
      ).toHaveCount(0);
    }
    const legalUpdate = await page.request.patch(
      "/api/admin/content/legal-notice",
      {
        data: {
          content: {
            fr: "## Mentions test\n\nContenu légal public.",
            en: "## Legal test\n\nPublic legal content.",
          },
        },
      },
    );
    expect(legalUpdate.status(), `${roleCase.username} legal update`).toBe(
      roleCase.username === "rootadmin" ? 200 : 403,
    );
    const canAuthor = ["rootadmin", "role-admin", "role-guides"].includes(
      roleCase.username,
    );
    const canModerate = ["rootadmin", "role-admin"].includes(roleCase.username);
    const slug = `rights-${roleCase.username}`;
    const payload = {
      slug,
      category: ["debuter"],
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
    if (roleCase.username === "role-readonly") {
      const blockedMutations = [
        page.request.post("/api/admin/users", { data: {} }),
        page.request.patch("/api/admin/users/unknown-user", { data: {} }),
        page.request.delete("/api/admin/users/unknown-user"),
        page.request.delete("/api/admin/logs", { data: {} }),
        page.request.patch("/api/admin/tools/calculator-ranking", { data: {} }),
        page.request.put("/api/admin/tools/city-parameters", { data: {} }),
        page.request.put("/api/admin/tools/ranking", { data: {} }),
        page.request.put("/api/admin/tools/templars", { data: {} }),
        page.request.put("/api/admin/tools/xp-gain-rate", { data: {} }),
        page.request.put("/api/admin/tools/demo-attack-troops", {
          data: {},
        }),
        page.request.put("/api/admin/tools/gems", { data: {} }),
        page.request.patch(
          "/api/admin/guides/references/combat-equipment/active",
          { data: {} },
        ),
        page.request.put("/api/admin/guides/references/combat-equipment", {
          data: {},
        }),
        page.request.put("/api/admin/guides/references/expedition-equipment", {
          data: {},
        }),
        page.request.put("/api/admin/guides/references/level-up", {
          data: {},
        }),
      ];
      for (const mutation of blockedMutations)
        expect((await mutation).status()).toBe(403);

      // F4: once the platform is set up, /api/admin/setup is closed to
      // everyone — the explicit "already completed" guard runs before the
      // role check, so it answers 409 (a stronger guarantee than the
      // per-role 403 above) rather than 403.
      expect(
        (await page.request.post("/api/admin/setup", { data: {} })).status(),
      ).toBe(409);

      const ownPassword = await page.request.patch(
        "/api/admin/profile/password",
        {
          data: {
            currentPassword: "role-test-password",
            newPassword: "role-test-password-updated",
          },
        },
      );
      expect(ownPassword.status()).toBe(204);
      await page.goto("/admin/setup");
      await expect(page).toHaveURL(/\/login$/);
    }
    await context.close();
  }
  await root.goto("/legal");
  await expect(
    root.getByRole("heading", { name: "Mentions test", level: 2 }),
  ).toBeVisible();
  await expect(root.getByText("Contenu légal public.")).toBeVisible();
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
  await page.getByText(/Catégories du guide \(\d+ sélectionnée/).click();
  await page.getByText("Combat & conquête", { exact: true }).click();
  await page.getByText("Clan & stratégie collective", { exact: true }).click();
  await page
    .getByLabel("Image représentative")
    .fill("https://example.com/guide-cover.jpg");
  await page.getByLabel("Titre (FR)").fill("Guide cycle complet");
  await page.getByLabel("Résumé (FR)").fill("Résumé du cycle complet");
  await page
    .getByLabel("Contenu Markdown (FR)")
    .fill("## Départ\n\nContenu initial avec ~~ancienne règle~~.");
  await expect(
    page.locator(".w-md-editor-preview").getByRole("heading", {
      name: "Départ",
    }),
  ).toBeVisible();
  await expect(page.locator(".w-md-editor-preview del")).toHaveText(
    "ancienne règle",
  );
  await page.getByRole("button", { name: "Soumettre en review" }).click();
  await expect(page).toHaveURL(/\/admin\/guides\/.+/);
  await expect(page.getByRole("status")).toHaveText("Guide enregistré.", {
    timeout: 15_000,
  });
  await page.getByLabel("Titre (FR)").fill("Guide édité et publié");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Guide enregistré.", {
    timeout: 15_000,
  });
  await page.goto("/admin/guides");
  const row = page.getByRole("row", { name: /Guide édité et publié/ });
  await expect(row.getByRole("combobox")).toHaveValue("pending_review");
  await row.getByRole("combobox").selectOption("published");
  await expect(page.getByRole("status")).toHaveText("Statut enregistré.");
  await page.goto("/guides");
  await expect(page.getByText("Guide édité et publié")).toBeVisible();
  await expect(
    page
      .locator(".guide-list-card")
      .filter({
        hasText: "Guide édité et publié",
      })
      .locator(".guide-list-cover"),
  ).toHaveAttribute("src", "https://example.com/guide-cover.jpg");
  for (const category of ["Combat & conquête", "Clan & stratégie collective"]) {
    await page.getByRole("button", { name: category }).click();
    await expect(page.getByText("Guide édité et publié")).toBeVisible();
  }
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
    "/api/admin/tools/calculator-ranking",
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
    "/api/admin/tools/calculator-ranking",
    { data: { active: true } },
  );
  expect(enabled.status()).toBe(200);
});

test("admin login is throttled and TOTP is required once enabled", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const rootContext = await browser.newContext();
  const root = await rootContext.newPage();
  const setup = await root.request.post("/api/admin/setup", {
    data: {
      username: "rootadmin",
      password: "correct-horse-battery-staple",
    },
  });
  expect([201, 409]).toContain(setup.status());
  await root.goto("/login");
  await root.getByLabel(/Username|Identifiant/).fill("rootadmin");
  await root
    .getByLabel(/Password|Mot de passe/)
    .fill("correct-horse-battery-staple");
  await root.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(root).toHaveURL(/\/admin$/);
  for (const username of ["totp-admin", "rate-limited-admin"]) {
    const created = await root.request.post("/api/admin/users", {
      data: { username, password: "security-test-password", role: "admin" },
    });
    expect(created.status()).toBe(201);
  }

  const totpContext = await browser.newContext();
  const totpPage = await totpContext.newPage();
  await totpPage.goto("/login");
  await totpPage.getByLabel(/Username|Identifiant/).fill("totp-admin");
  await totpPage
    .getByLabel(/Password|Mot de passe/)
    .fill("security-test-password");
  await totpPage.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(totpPage).toHaveURL(/\/admin$/);
  const enrollmentResponse = await totpPage.request.post(
    "/api/admin/profile/totp/setup",
  );
  expect(enrollmentResponse.status()).toBe(200);
  const enrollment = (await enrollmentResponse.json()) as {
    secret: string;
    qrCodeDataUrl: string;
  };
  expect(enrollment.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  const totp = new OTPAuth.TOTP({
    issuer: "ML-Helper",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(enrollment.secret),
  });
  const enableResponse = await totpPage.request.patch(
    "/api/admin/profile/totp",
    { data: { token: totp.generate() } },
  );
  expect(enableResponse.status()).toBe(204);
  await totpContext.close();

  const protectedContext = await browser.newContext();
  const protectedPage = await protectedContext.newPage();
  await protectedPage.goto("/login");
  await protectedPage.getByLabel(/Username|Identifiant/).fill("totp-admin");
  await protectedPage
    .getByLabel(/Password|Mot de passe/)
    .fill("security-test-password");
  await protectedPage
    .getByRole("button", { name: /Sign in|Se connecter/ })
    .click();
  await expect(protectedPage.locator("p[role='alert']")).toHaveText(
    "Identifiant ou mot de passe invalide",
  );
  await protectedPage
    .getByLabel("Code d’authentification")
    .fill(totp.generate());
  await protectedPage.getByLabel(/Username|Identifiant/).fill("totp-admin");
  await protectedPage
    .getByLabel(/Password|Mot de passe/)
    .fill("security-test-password");
  await protectedPage
    .getByRole("button", { name: /Sign in|Se connecter/ })
    .click();
  await expect(protectedPage).toHaveURL(/\/admin$/);
  await protectedContext.close();

  const throttleContext = await browser.newContext();
  const throttlePage = await throttleContext.newPage();
  await throttlePage.goto("/login");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await throttlePage
      .getByLabel(/Username|Identifiant/)
      .fill("rate-limited-admin");
    await throttlePage
      .getByLabel(/Password|Mot de passe/)
      .fill("wrong-password");
    await throttlePage
      .getByRole("button", { name: /Sign in|Se connecter/ })
      .click();
    await expect(throttlePage.locator("p[role='alert']")).toHaveText(
      "Identifiant ou mot de passe invalide",
    );
  }
  await throttlePage
    .getByLabel(/Username|Identifiant/)
    .fill("rate-limited-admin");
  await throttlePage
    .getByLabel(/Password|Mot de passe/)
    .fill("security-test-password");
  await throttlePage
    .getByRole("button", { name: /Sign in|Se connecter/ })
    .click();
  await expect(throttlePage.locator("p[role='alert']")).toHaveText(
    "Identifiant ou mot de passe invalide",
  );
  await expect(throttlePage).toHaveURL(/\/login$/);
  await throttleContext.close();
  await rootContext.close();
});

// Bloc 69/F: no league-buttons group (.family-buttons) may ever cause a
// vertical (or horizontal) scrollbar on itself, at any viewport width —
// checked across all 7 locations across the site that render one: Player
// Settings (D), the 3 City tools + Demo Attack Troops (E), Classement
// (G), Level Up/Progression and Événements (already shipped at Bloc 68,
// re-verified here rather than assumed correct).
test("no league button group ever causes a scrollbar on itself, at mobile or desktop widths", async ({
  page,
}) => {
  test.setTimeout(300_000);
  async function assertNoScroll(label: string) {
    const groups = page.locator(".family-buttons");
    const count = await groups.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const info = await groups.nth(i).evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(info.scrollHeight, `${label} #${i} vertical`).toBeLessThanOrEqual(
        info.clientHeight + 1,
      );
      expect(info.scrollWidth, `${label} #${i} horizontal`).toBeLessThanOrEqual(
        info.clientWidth + 1,
      );
    }
  }

  for (const width of [390, 1000, 1280]) {
    await page.setViewportSize({ width, height: 900 });

    await page.goto("/tools/villes");
    await page.getByText("Paramètres du joueur", { exact: true }).click();
    await assertNoScroll(`w${width} PlayerSettings+CityCost`);
    await page.getByRole("tab", { name: "Niveau Max Atteignable" }).click();
    await assertNoScroll(`w${width} CityMaxLevel`);
    await page.getByRole("tab", { name: "Production", exact: true }).click();
    await assertNoScroll(`w${width} CityProduction`);

    await page.goto("/tools/combat");
    await page.getByRole("tab", { name: "Troupes en attaque démo" }).click();
    await assertNoScroll(`w${width} DemoAttack`);

    await page.goto("/tools/classement");
    await assertNoScroll(`w${width} Classement`);

    // Événements ships inactive by default (see the "Bloc60" test above) and
    // renders no .family-buttons group until an admin activates it; its
    // league picker shares the exact same LeagueButtons component and
    // .league-buttons-grid mobile CSS as Level Up/Progression below, so this
    // loop's Level Up check already exercises the same code path.
    await page.goto("/referentiels/level-up");
    await assertNoScroll(`w${width} LevelUp`);
  }
});

// ---------------------------------------------------------------------------
// Bloc 90: admin language visibility. These tests live in this file (rather
// than a separate spec) on purpose: they create/rely on the Super Admin, and
// this file runs in serial mode, so they run after the "first launch" test
// above — a separate parallel spec would race that test's pristine-DB
// assumption by creating the Super Admin first. Each test re-enables any
// locale it disables so the rest of the suite is unaffected.
// ---------------------------------------------------------------------------

const B90_ROOT = {
  username: "rootadmin",
  password: "correct-horse-battery-staple",
};

async function b90EnsureRoot(page: Page) {
  const setup = await page.request.post("/api/admin/setup", { data: B90_ROOT });
  expect([201, 409]).toContain(setup.status());
}

async function b90Login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/Username|Identifiant/).fill(username);
  await page.getByLabel(/Password|Mot de passe/).fill(password);
  await page.getByRole("button", { name: /Sign in|Se connecter/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function b90SetLocaleActive(page: Page, locale: string, active: boolean) {
  const response = await page.request.patch("/api/admin/config/locales", {
    data: { locale, active },
  });
  expect(response.ok(), `toggle ${locale}=${active}`).toBeTruthy();
}

// Bloc 90/A: the Configuration tab is reachable only by admin/super_admin —
// both in the UI (nav link + page) and via a forged API request.
test("Bloc 90/A: Configuration tab restricted to admin/super_admin", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const rootContext = await browser.newContext();
  const root = await rootContext.newPage();
  await b90EnsureRoot(root);
  await b90Login(root, B90_ROOT.username, B90_ROOT.password);

  await expect(root.getByRole("link", { name: "Configuration" })).toBeVisible();
  const configResponse = await root.goto("/admin/config");
  expect(configResponse?.status()).toBe(200);
  await expect(root.getByRole("cell", { name: "Deutsch" })).toBeVisible();

  const created = await root.request.post("/api/admin/users", {
    data: {
      username: "b90-tools",
      role: "tools_manager",
      password: "role-test-password",
    },
  });
  expect([201, 409]).toContain(created.status());
  await rootContext.close();

  const toolsContext = await browser.newContext();
  const tools = await toolsContext.newPage();
  await b90Login(tools, "b90-tools", "role-test-password");
  await expect(tools.getByRole("link", { name: "Configuration" })).toHaveCount(
    0,
  );
  const denied = await tools.goto("/admin/config");
  expect(denied?.status()).toBe(403);
  await expect(
    tools.getByRole("heading", { name: "Accès interdit" }),
  ).toBeVisible();
  const forged = await tools.request.patch("/api/admin/config/locales", {
    data: { locale: "de", active: false },
  });
  expect(forged.status()).toBe(403);
  await toolsContext.close();
});

// Bloc 90/D: EN and FR can never be deactivated — their toggles are locked in
// the UI, and a forged API request to disable them is rejected.
test("Bloc 90/D: English and French cannot be deactivated", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await b90EnsureRoot(page);
  await b90Login(page, B90_ROOT.username, B90_ROOT.password);
  await page.goto("/admin/config");

  for (const locale of ["en", "fr"]) {
    await expect(page.getByTestId(`locale-locked-${locale}`)).toBeDisabled();
    await expect(page.getByTestId(`locale-toggle-${locale}`)).toHaveCount(0);
  }
  for (const locale of ["de", "es", "tr"])
    await expect(page.getByTestId(`locale-toggle-${locale}`)).toBeEnabled();

  for (const locale of ["en", "fr"]) {
    const forged = await page.request.patch("/api/admin/config/locales", {
      data: { locale, active: false },
    });
    expect(forged.status(), `deactivate ${locale}`).toBe(422);
  }
  await context.close();
});

// Bloc 90/B+C+E: deactivating a language persists in the DB, removes it from
// the public selector, and renders a visitor whose cookie points at it in
// English — while its JSON files stay put (its content still renders once
// re-enabled).
test("Bloc 90/B+C+E: deactivating DE hides it publicly and redirects to EN", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await b90EnsureRoot(admin);
  await b90Login(admin, B90_ROOT.username, B90_ROOT.password);

  await b90SetLocaleActive(admin, "de", false);

  // Bloc 90/B: persisted — a reload of the tab shows DE inactive.
  await admin.goto("/admin/config");
  const deRow = admin.getByRole("row").filter({ hasText: "Deutsch" });
  await expect(deRow).toContainText(/Inactive|Disabled/);

  // Bloc 90/C: the public selector no longer offers DE, but still offers the
  // other active locales.
  const publicContext = await browser.newContext();
  const visitor = await publicContext.newPage();
  await visitor.goto("/");
  await visitor.locator(".locale-select-trigger").click();
  const codes = await visitor.getByRole("option").allInnerTexts();
  expect(codes).not.toContain("DE");
  expect(codes).toEqual(expect.arrayContaining(["EN", "FR", "ES", "TR"]));
  await publicContext.close();

  // Bloc 90/E: a visitor whose NEXT_LOCALE cookie is the now-disabled DE is
  // rendered in English (html lang="en").
  const staleContext = await browser.newContext();
  await staleContext.addCookies([
    { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3000" },
  ]);
  const stale = await staleContext.newPage();
  await stale.goto("/");
  await expect(stale.locator("html")).toHaveAttribute("lang", "en");
  await staleContext.close();

  // Cleanup: re-enable DE and confirm its content renders again (files intact).
  await b90SetLocaleActive(admin, "de", true);
  const reContext = await browser.newContext();
  await reContext.addCookies([
    { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3000" },
  ]);
  const rehydrated = await reContext.newPage();
  await rehydrated.goto("/");
  await expect(rehydrated.locator("html")).toHaveAttribute("lang", "de");
  await reContext.close();
  await adminContext.close();
});

// Bloc 90/F: the public deactivation never blocks admin content editing in
// that language — the editorial locale picker still offers it and its fields
// stay editable.
test("Bloc 90/F: admin can still edit content in a deactivated language", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await b90EnsureRoot(page);
  await b90Login(page, B90_ROOT.username, B90_ROOT.password);

  await b90SetLocaleActive(page, "es", false);

  await page.goto("/admin/guides/new");
  const picker = page.getByLabel("Langue du guide");
  await expect(picker.locator("option", { hasText: "ES" })).toHaveCount(1);
  await picker.selectOption("es");
  const title = page.getByLabel("Titre (ES)");
  await title.fill("Título en español");
  await expect(title).toHaveValue("Título en español");

  await b90SetLocaleActive(page, "es", true);
  await context.close();
});

// Bloc 91/E1: locale-prefixed public routing. Runs last (serial file), after
// the Bloc 90 tests have re-enabled every locale, so all 5 are active here.
test("Bloc 91/E1: the 5 languages have their own URL, with distinct hreflang and canonical", async ({
  page,
}) => {
  test.setTimeout(60_000);
  // Each launched locale renders at its own /[locale]/ URL with a matching
  // <html lang>.
  for (const locale of ["fr", "en", "de", "es", "tr"]) {
    const response = await page.goto(`/${locale}/tools`);
    expect(response?.status(), `${locale} status`).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  }

  // An unprefixed public URL redirects to a locale-prefixed one.
  await page.goto("/tools");
  expect(page.url()).toMatch(/\/(fr|en|de|es|tr)\/tools$/);

  // hreflang: 5 distinct locale alternates + x-default, all pointing at
  // language-specific URLs (E1's core SEO fix).
  await page.goto("/fr/tools");
  const alternates = page.locator('link[rel="alternate"][hreflang]');
  await expect(alternates).toHaveCount(6);
  const hrefs = await alternates.evaluateAll((links) =>
    links.map((l) => `${l.getAttribute("hreflang")}=${l.getAttribute("href")}`),
  );
  expect(hrefs).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/fr=.*\/fr\/tools$/),
      expect.stringMatching(/en=.*\/en\/tools$/),
      expect.stringMatching(/de=.*\/de\/tools$/),
      expect.stringMatching(/x-default=.*\/fr\/tools$/),
    ]),
  );

  // canonical is the current locale's own URL.
  await page.goto("/en/tools");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/tools$/,
  );

  // The language selector navigates to the same page under the chosen locale.
  await page.goto("/fr/tools");
  await page.locator(".locale-select-trigger").click();
  await page.getByRole("option", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/tools$/);

  // Codex P2: a language switch keeps the query string, so a deep link like
  // ?open=gems (which tools/[slug] reads to pick a calculator tab) survives.
  // exact: true — the competences page's league <select> has EN-substring
  // options ("Argent", "Légende") that a fuzzy name match would also catch.
  await page.goto("/fr/tools/competences?open=gems");
  await page.locator(".locale-select-trigger").click();
  await page.getByRole("option", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/tools\/competences\?open=gems$/);
});
