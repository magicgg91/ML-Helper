import { expect, test } from "@playwright/test";
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
  await expect(page).toHaveTitle("ML Helper");
  await expect(page.getByPlaceholder("Rechercher")).toBeVisible();
  // Bloc 34/D: the carousel/hero is gone — a short intro sentence in its
  // place, the tool category grid as the actual homepage content.
  await expect(page.locator(".home-carousel")).toHaveCount(0);
  await expect(page.locator(".home-intro p")).toHaveText(
    "ML Helper réunit les outils et référentiels de la communauté pour préparer chaque décision de jeu sur Million Lords.",
  );
  // Bloc 33/A: the homepage gives 1-click access to a tool category
  // directly (the same ToolCategoryGrid as /tools).
  await expect(page.getByRole("link", { name: /Villes/ })).toHaveAttribute(
    "href",
    "/tools/villes",
  );
  // Bloc 34/E: the most recent guides + the built references are directly
  // clickable from the homepage, no detour via /guides.
  await expect(
    page.getByRole("link", { name: /Guide visible/ }),
  ).toHaveAttribute("href", "/guides/guide-visible");
  await expect(
    page.getByRole("link", { name: /Coût des Templiers/ }),
  ).toHaveAttribute("href", "/referentiels/templars");
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
  await expect(page).toHaveTitle("Guides");
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
  await expect(page).toHaveTitle("Outils");
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
  await expect(page).toHaveTitle("Outils — Villes");
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
  await expect(page).toHaveTitle("Guides — Guide visible");
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
  for (const [league, expected] of [
    ["bronze", "70"],
    ["silver", "35"],
    ["gold", "28"],
    ["diamond", "21"],
  ]) {
    await page.getByLabel("Ligue de l’attaquant").selectOption(league);
    await expect(page.getByTestId("demo-troops")).toHaveText(expected);
  }
});

test("Level Up is a Référentiels reference and keeps Silver unconfirmed", async ({
  page,
}) => {
  await page.goto("/referentiels/level-up");
  await expect(page.getByRole("heading", { name: "Level Up" })).toBeVisible();
  for (const league of ["bronze", "gold", "platinum", "diamond", "legend"]) {
    await page.getByRole("combobox", { name: "Ligue" }).selectOption(league);
    await expect(page.getByRole("table").first()).toBeVisible();
  }
  await page.getByRole("combobox", { name: "Ligue" }).selectOption("silver");
  await expect(page.getByRole("status")).toContainText("non encore confirmée");
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.goto("/tools/level-up");
  await expect(page).toHaveTitle(/404|Not Found/i);
});

test("calculator pages only repeat names in their navigation tabs", async ({
  page,
}) => {
  for (const slug of ["villes", "classement", "competences"]) {
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
  const cityLeague = page
    .locator(".city-calculators")
    .getByRole("combobox", { name: "Ligue" });
  await expect(cityLeague).toHaveValue("");
  await cityLeague.selectOption("legend");
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
    .getByRole("combobox", { name: "Ligue" })
    .selectOption("legend");
  await page.getByRole("spinbutton", { name: "Or disponible" }).fill("0.044");
  await expect(page.getByTestId("max-level-result")).toHaveText("4");

  await page.getByRole("tab", { name: "Production", exact: true }).click();
  await page
    .locator(".city-calculators")
    .getByRole("combobox", { name: "Ligue" })
    .selectOption("legend");
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

  await page.goto("/tools/villes");
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  for (const [
    league,
    boostedGold,
    boostedArmy,
    baseGold,
    baseArmy,
  ] of leagueCases) {
    await page.getByLabel("Ligue").first().selectOption(league);

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
  const playerLeague = page
    .locator(".player-settings")
    .getByRole("combobox", { name: "Ligue" });
  const cityLeague = page
    .locator(".city-calculators")
    .getByRole("combobox", { name: "Ligue" });

  await expect(playerLeague).toHaveValue("");
  await expect(cityLeague).toHaveValue("");
  await playerLeague.selectOption("diamond");
  await expect(cityLeague).toHaveValue("diamond");

  await cityLeague.selectOption("gold");
  await playerLeague.selectOption("legend");
  await expect(cityLeague).toHaveValue("gold");

  await page.getByRole("tab", { name: "Niveau Max Atteignable" }).click();
  await expect(
    page.locator(".city-calculators").getByRole("combobox", { name: "Ligue" }),
  ).toHaveValue("legend");
});

test("Ranking converts position and percentage into league ranges", async ({
  page,
}) => {
  await page.goto("/tools/classement");
  await expect(page.getByRole("link", { name: "Classement" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page
    .locator(".ranking-calculator")
    .getByLabel("Ligue")
    .selectOption("diamond");
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
  await expect(
    page.getByRole("link", { name: "Voir le référentiel complet" }),
  ).toHaveAttribute("href", "/referentiels/combat-equipment");

  await page.getByRole("tab", { name: "Gemmes" }).click();
  // Bloc 36/A: same cross-link pattern already verified for Templiers below.
  await expect(
    page.getByRole("link", { name: "Voir le référentiel complet" }),
  ).toHaveAttribute("href", "/referentiels/gems");
  await page.getByRole("tab", { name: "Budget disponible" }).click();
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
  await expect(
    page.getByRole("link", { name: "Voir le référentiel complet" }),
  ).toHaveAttribute("href", "/referentiels/templars");
  await page.getByRole("spinbutton", { name: "Niveau cible" }).fill("3");
  await expect(page.getByTestId("templar-cost")).toHaveText("599 Pouciel");
  // Point 1: one shared level range applies to all 5 skills at once.
  const rusherRow = page.getByRole("row", { name: /Vitesse/ });
  await expect(rusherRow.getByRole("cell").nth(1)).toHaveText("1%/Templier");
  await expect(rusherRow.getByRole("cell").nth(2)).toHaveText("3%");
  await expect(rusherRow.getByRole("cell").nth(3)).toHaveText("+3%");
  await page.getByRole("spinbutton", { name: "Niveau de départ" }).fill("1");
  await expect(rusherRow.getByRole("cell").nth(3)).toHaveText("+2%");
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
  ).toHaveAttribute("href", "/referentiels/combat-equipment");
  await expect(
    referentielsGrid.getByRole("link", { name: /Équipements d’Expédition/ }),
  ).toHaveAttribute("href", "/referentiels/expedition-equipment");

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
  await page.getByRole("spinbutton", { name: "Base" }).fill("200");
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
  // same shared parameters, reached from either admin table.
  await expect(page.getByRole("spinbutton", { name: "Base" })).toHaveValue(
    "200",
  );
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

test("direct admin URLs enforce all six roles", async ({ browser }) => {
  test.setTimeout(60_000);
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
      // read_only has references.read too, so /admin/referentiels joins the
      // other 4 sections it can already reach.
      allowed: [
        "/admin/guides",
        "/admin/referentiels",
        "/admin/tools",
        "/admin/users",
        "/admin/logs",
      ],
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
        page.request.post("/api/admin/setup", { data: {} }),
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
