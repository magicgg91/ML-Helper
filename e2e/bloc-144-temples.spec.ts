import { expect, test, type Page } from "@playwright/test";

/**
 * Bloc 144 — l'interrupteur « Temples », mesuré au navigateur.
 *
 * Ce fichier ne reprend pas ce que les tests unitaires tiennent déjà (la règle
 * de calcul, le rendu, la persistance). Il tient les trois choses qu'aucun
 * d'eux ne peut voir :
 *
 *  1. l'ALIGNEMENT du §4 — quatre bords au pixel, qui n'existent qu'une fois la
 *     page disposée ;
 *  2. le CONTRASTE réellement rendu — un jeton mal référencé fait tomber une
 *     paire sous le seuil sans qu'aucun garde-fou de la feuille de style ne le
 *     voie, puisque la déclaration, elle, est juste ;
 *  3. le CLAVIER — Espace et Entrée activent un <button> nativement, ce que
 *     jsdom n'implémente pas : le vérifier ailleurs qu'ici reviendrait à
 *     vérifier jsdom.
 */

const PANEL = ".player-settings";

async function openPanel(page: Page, path = "/tools/villes") {
  await page.goto(path);
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  await expect(page.locator(`${PANEL} .player-rung-buttons`)).toBeVisible();
}

const templeSwitch = (page: Page) =>
  page.getByRole("switch", { name: "Inclure les temples dans les calculs" });

/**
 * Le rapport de contraste WCAG entre deux couleurs rendues, telles que le
 * navigateur les donne. Le fond est cherché en remontant les ancêtres jusqu'au
 * premier qui n'est pas transparent — c'est ce que l'œil voit, et c'est ce
 * qu'une couleur déclarée ne dit pas.
 */
async function contrastOf(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const parse = (value: string) =>
        (value.match(/[\d.]+/g) ?? []).slice(0, 4).map(Number);
      const luminance = ([r, g, b]: number[]) =>
        [r!, g!, b!]
          .map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          })
          .reduce(
            (total, value, index) =>
              total + value * [0.2126, 0.7152, 0.0722][index]!,
            0,
          );

      const backgroundOf = (node: Element | null): number[] => {
        for (let current = node; current; current = current.parentElement) {
          const color = parse(getComputedStyle(current).backgroundColor);
          if (color.length >= 3 && (color[3] ?? 1) > 0) return color;
        }
        return [255, 255, 255];
      };

      const foreground = parse(getComputedStyle(element).color);
      const background = backgroundOf(element);
      const [lighter, darker] = [
        luminance(foreground),
        luminance(background),
      ].sort((a, b) => b - a);
      return {
        ratio: Number(((lighter! + 0.05) / (darker! + 0.05)).toFixed(2)),
        foreground: getComputedStyle(element).color,
        background: `rgb(${background.slice(0, 3).join(", ")})`,
      };
    });
}

/**
 * Point §4 — ligue / niveau / VP alignés au pixel.
 *
 * Quatre bords, pas un : le haut de la première rangée de boutons contre le
 * haut du champ Niveau, et le bas de la seconde contre le bas du champ VP.
 * C'est la mesure que le brief demande de vérifier en capture ; ici elle est
 * lue, donc elle ne peut plus se perdre.
 */
test("Bloc 144/§4: the rung rows and the Niveau/VP fields share their top and bottom edges", async ({
  page,
}) => {
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openPanel(page);

    const edges = await page
      .locator(`${PANEL} .player-general`)
      .evaluate((row) => {
        const round = (value: number) => Math.round(value);
        const buttons = [
          ...row.querySelectorAll<HTMLElement>(".player-rung-buttons button"),
        ].map((button) => button.getBoundingClientRect());
        const firstRowTop = Math.min(...buttons.map((box) => box.top));
        const lastRowBottom = Math.max(...buttons.map((box) => box.bottom));
        const level = row
          .querySelector(".player-level-field .num-stepper")!
          .getBoundingClientRect();
        const vp = row
          .querySelector(".player-vp-field .num-stepper")!
          .getBoundingClientRect();
        return {
          rungTop: round(firstRowTop),
          rungBottom: round(lastRowBottom),
          levelTop: round(level.top),
          vpBottom: round(vp.bottom),
          rowHeights: [...new Set(buttons.map((box) => round(box.height)))],
          levelHeight: round(level.height),
          vpHeight: round(vp.height),
          // Les deux steppers doivent faire la même largeur : c'est la réserve
          // laissée vide sur la rangée Niveau qui le garantit.
          levelWidth: round(level.width),
          vpWidth: round(vp.width),
        };
      });

    expect(edges.rungTop, `w${width} haut`).toBe(edges.levelTop);
    expect(edges.rungBottom, `w${width} bas`).toBe(edges.vpBottom);
    // 36 px partout, comme le §4 le demande.
    expect(edges.rowHeights, `w${width}`).toEqual([36]);
    expect(edges.levelHeight, `w${width}`).toBe(36);
    expect(edges.vpHeight, `w${width}`).toBe(36);
    expect(edges.levelWidth, `w${width}`).toBe(edges.vpWidth);
  }
});

/**
 * Point §1 — l'interrupteur au clavier.
 *
 * Espace et Entrée, les deux, parce que c'est ce que le Bloc 92 exige d'un
 * `role="switch"` et que seul un vrai <button> les donne sans code.
 */
test("Bloc 144/§1: the switch answers Space and Enter, and aria-checked follows", async ({
  page,
}) => {
  await openPanel(page);
  const control = templeSwitch(page);
  await expect(control).toHaveAttribute("aria-checked", "true");

  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(`${PANEL} .player-temples-off-pill`)).toHaveText(
    "Temples exclus",
  );

  await page.keyboard.press("Enter");
  await expect(control).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(`${PANEL} .player-temples-off-pill`)).toHaveCount(
    0,
  );

  // Le mot à droite est cliquable lui aussi, sans double bascule.
  await page.locator(`${PANEL} .player-switch-text`).click();
  await expect(control).toHaveAttribute("aria-checked", "false");
});

/**
 * Point §1 — l'état traverse les outils et un rechargement, par le même
 * stockage que le reste des paramètres du joueur.
 */
test("Bloc 144/§1: the switch survives a reload and a change of tool", async ({
  page,
}) => {
  await openPanel(page);
  await templeSwitch(page).click();
  await expect(templeSwitch(page)).toHaveAttribute("aria-checked", "false");

  await page.reload();
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  await expect(templeSwitch(page)).toHaveAttribute("aria-checked", "false");

  // Un autre outil, le même bandeau.
  await openPanel(page, "/tools/classement");
  await expect(templeSwitch(page)).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(`${PANEL} .player-temples-off-pill`)).toHaveText(
    "Temples exclus",
  );
});

/**
 * Point §1 — les champs Temples restent pleinement utilisables, interrupteur
 * éteint, et ce qui y est tapé s'applique dès qu'il se rallume.
 */
test("Bloc 144/§1: the Temples fields stay editable while excluded, and count again once included", async ({
  page,
}) => {
  await openPanel(page);
  await templeSwitch(page).click();

  const field = page.getByLabel("Temple Attaque", { exact: true });
  await expect(field).toBeEditable();
  await expect(field).toHaveCSS("opacity", "1");
  // Le « = X% » est barré, pas caché.
  const percent = page.locator(`${PANEL} [data-percent="temple-striker"]`);
  await expect(percent).toBeVisible();
  await expect(percent).toHaveCSS("text-decoration-line", "line-through");

  await page.getByRole("button", { name: "Augmenter Temple Attaque" }).click();
  const typed = await field.inputValue();
  expect(Number(typed)).toBeGreaterThan(0);

  await templeSwitch(page).click();
  await expect(field).toHaveValue(typed);
  await expect(percent).not.toHaveCSS("text-decoration-line", "line-through");
});

/**
 * Point §1 — l'outil qui consomme les stats suit vraiment l'interrupteur, sur
 * la page réelle et non dans un rendu de test.
 */
test("Bloc 144/§1: the Production tool drops the temple line when the switch is off", async ({
  page,
}) => {
  await openPanel(page);
  await page
    .locator(".city-calculators")
    .getByRole("tab", { name: "Production", exact: true })
    .click();
  // L'outil n'affiche ses résultats qu'une fois une ligue choisie.
  await page
    .locator(".city-calculators")
    .getByRole("group", { name: "Ligue" })
    .getByRole("button", { name: "Légende" })
    .click();

  const templeRow = page
    .getByTestId("city-production-gold-table")
    .locator("tbody tr")
    .filter({ hasText: "Temple" })
    .first();
  const before = await page.getByTestId("city-production-gold").textContent();
  await expect(templeRow.locator("td").first()).not.toHaveText("0");

  await templeSwitch(page).click();
  await expect(templeRow.locator("td").first()).toHaveText("0");
  await expect(page.getByTestId("city-production-gold")).not.toHaveText(
    before ?? "",
  );

  await templeSwitch(page).click();
  await expect(page.getByTestId("city-production-gold")).toHaveText(
    before ?? "",
  );
});

/**
 * Point « couleurs » — les contrastes réellement rendus, dans les deux thèmes.
 *
 * Mesurés sur les pixels, pas sur la feuille de style : c'est exactement le cas
 * qu'un jeton mal référencé produit — une déclaration juste, une couleur fausse.
 */
for (const theme of ["dark", "light"] as const) {
  test(`Bloc 144: every text pair introduced reads at 4.5:1 or better (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(
      (value) => window.localStorage.setItem("mlhelper_theme", value),
      theme,
    );
    await openPanel(page);
    await templeSwitch(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const pairs = {
      "« Exclus »": `${PANEL} .player-switch-text`,
      "pastille « Temples exclus »": `${PANEL} .player-temples-off-pill`,
      "« = X% » barré": `${PANEL} .player-matrix-percent-ignored`,
      "compteur de points": `${PANEL} .player-points-allocated`,
    };
    for (const [name, selector] of Object.entries(pairs)) {
      const measured = await contrastOf(page, selector);
      expect(
        measured.ratio,
        `${name} (${theme}) : ${measured.foreground} sur ${measured.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }

    // Et « Inclus », qui n'existe qu'une fois l'interrupteur rallumé.
    await templeSwitch(page).click();
    const on = await contrastOf(page, `${PANEL} .player-switch-text`);
    expect(
      on.ratio,
      `« Inclus » (${theme}) : ${on.foreground} sur ${on.background}`,
    ).toBeGreaterThanOrEqual(4.5);
  });
}

/**
 * Point §1 « Mobile » — le même interrupteur sous l'en-tête de colonne
 * « Temples » de la matrice transposée, et la page qui ne défile toujours pas
 * de côté (la règle du Bloc 123/D, reprise ici parce que ce bloc ajoute un
 * élément dans la colonne la plus étroite).
 */
test("Bloc 144/§1: the transposed matrix carries the same switch, without pushing the page sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPanel(page);

  const control = templeSwitch(page);
  await expect(control).toBeVisible();
  expect(
    await control.evaluate(
      (node) => node.closest(".player-matrix-mobile th") !== null,
    ),
  ).toBe(true);

  await control.click();
  await expect(control).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(`${PANEL} .player-temples-off-pill`)).toBeVisible();

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);

  // La cible reste au-dessus du minimum de la WCAG 2.2 (24 px).
  const box = await page.locator(`${PANEL} .player-switch-field`).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(24);
});
