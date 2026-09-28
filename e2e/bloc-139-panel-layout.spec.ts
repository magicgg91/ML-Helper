import { expect, test, type Page } from "@playwright/test";

/**
 * Bloc 139 — la mise en page du bandeau « Paramètres du joueur », mesurée.
 *
 * Les quatre points de ce bloc sont des largeurs : ils ne se voient qu'une
 * fois la page disposée, et aucun ne se déduit de la feuille de style.
 * L'un d'eux ne se déduisait même pas de la règle CSS qui semblait le tenir —
 * les colonnes de grille écrites sur `.number-stepper` sont inertes depuis
 * qu'une règle postérieure repasse le conteneur en flex (`.num-stepper`,
 * Bloc 92/L4), et le champ a vécu treize pixels de large sans que rien ne le
 * signale. D'où ce fichier : des dimensions lues dans le navigateur, et
 * relatives entre elles plutôt que comparées à des littéraux.
 *
 * Il ne lit rien qu'il n'ait ouvert lui-même et n'écrit pas en base : l'échelle
 * est celle du jeu de données semé, six échelons. Le cas à dix — celui qui
 * débordait — vit dans phase-one.spec.ts (« Bloc109 »), le seul fichier qui
 * ait le droit d'en créer.
 */

const PANEL = ".player-settings";

async function openPanel(page: Page, path: string) {
  await page.goto(path);
  await page.getByText("Paramètres du joueur", { exact: true }).click();
  await expect(page.locator(`${PANEL} .player-rung-buttons`)).toBeVisible();
}

/** Les rangées d'un groupe de boutons, par leur bord supérieur. */
async function rowCount(page: Page, selector: string) {
  return page
    .locator(selector)
    .evaluate(
      (group) =>
        new Set(
          [...group.querySelectorAll("button")].map((button) =>
            Math.round(button.getBoundingClientRect().top),
          ),
        ).size,
    );
}

/**
 * Point A — les échelons sur deux rangées.
 *
 * Constat : les boutons tenaient sur une seule ligne, qui débordait et coupait
 * le dernier. Deux rangées, donc, et le groupe ne défile pas sur lui-même :
 * c'est la règle du Bloc 69/F, reprise ici sur ce groupe précis parce que
 * c'est exactement celle qui était rompue.
 */
test("Bloc 139/A: the rung buttons land on two rows, and none is cut off", async ({
  page,
}) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await openPanel(page, "/tools/villes");
    const group = page.locator(`${PANEL} .player-rung-buttons`);

    expect(
      await rowCount(page, `${PANEL} .player-rung-buttons`),
      `w${width}`,
    ).toBe(2);

    const box = await group.evaluate((element) => {
      const buttons = [...element.querySelectorAll("button")];
      const rect = element.getBoundingClientRect();
      return {
        count: buttons.length,
        overflowX: element.scrollWidth - element.clientWidth,
        overflowY: element.scrollHeight - element.clientHeight,
        // Le symptôme rapporté : le dernier bouton sortait du groupe.
        lastSpill: Math.round(
          buttons[buttons.length - 1].getBoundingClientRect().right -
            rect.right,
        ),
        // Aucun bouton réduit à rien par le partage en colonnes égales.
        narrowest: Math.min(
          ...buttons.map((button) => button.getBoundingClientRect().width),
        ),
      };
    });
    expect(box.count, `w${width} rungs`).toBe(6);
    expect(box.overflowX, `w${width} horizontal`).toBeLessThanOrEqual(1);
    expect(box.overflowY, `w${width} vertical`).toBeLessThanOrEqual(1);
    expect(box.lastSpill, `w${width} last button`).toBeLessThanOrEqual(1);
    expect(box.narrowest, `w${width} narrowest button`).toBeGreaterThan(40);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      `w${width} page scrolls sideways`,
    ).toBeLessThanOrEqual(1);
  }
});

/**
 * Point B — la place rendue au chiffre dans la matrice.
 *
 * Constat : « les champs de saisie sont si étroits qu'une valeur à deux
 * chiffres est tronquée, alors que − et + prennent une place
 * disproportionnée ». Mesuré avant le bloc, dans une cellule de 93 px :
 * 40 px de bouton, 13 px de champ, 40 px de bouton — et « 20 » coupé.
 * Les dimensions sont donc comparées entre elles, pas à des littéraux.
 */
test("Bloc 139/B: the matrix field is wider than its − / + buttons, and shows a 2-digit value whole", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openPanel(page, "/tools/villes");

  const field = page.getByRole("spinbutton", {
    name: "Attaque avec équipement",
    exact: true,
  });
  await field.fill("20");

  const stepper = await page
    .locator(`${PANEL} .player-matrix .num-stepper`)
    .first()
    .evaluate((element) => {
      const input = element.querySelector("input")!;
      const buttons = [...element.querySelectorAll("button")];
      return {
        cell: element.getBoundingClientRect().width,
        field: input.getBoundingClientRect().width,
        button: Math.max(
          ...buttons.map((button) => button.getBoundingClientRect().width),
        ),
        height: Math.round(buttons[0].getBoundingClientRect().height),
        clipped: input.scrollWidth > input.clientWidth + 1,
        overflow: element.scrollWidth - element.clientWidth,
      };
    });

  // La valeur à deux chiffres tient : le constat, littéralement.
  expect(stepper.clipped, "2-digit value clipped").toBe(false);
  // Et elle tient parce que le champ a plus de place que chaque bouton, là où
  // il en avait trois fois moins.
  expect(stepper.field).toBeGreaterThan(stepper.button);
  // La moitié de la cellule au moins revient au champ.
  expect(stepper.field / stepper.cell).toBeGreaterThan(0.4);
  // Les boutons restent des cibles : le minimum de la WCAG 2.2 (2.5.8, AA)
  // est 24 × 24 px, et c'est ce plancher que la réduction vise.
  expect(stepper.button).toBeGreaterThanOrEqual(24);
  // Hauteur inchangée par le bloc — seule la largeur bouge.
  expect(stepper.height).toBe(32);
  expect(stepper.overflow).toBeLessThanOrEqual(1);
});

/**
 * Point D — les deux bandeaux à la largeur de leurs voisins.
 *
 * Comparaison de largeurs effectives, pas d'impression visuelle : le bandeau
 * des catégories d'outils et celui des référentiels sont le même composant,
 * et tous deux étaient 16 px plus larges que le contenu qu'ils surmontent
 * (1200 contre 1184, mesuré à 1440 px).
 */
test("Bloc 139/D: both selection bands are exactly as wide as the content around them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });

  // Le bandeau des catégories d'outils, entre le bandeau des paramètres du
  // joueur et le contenu de l'outil — et, avec eux, l'en-tête de page (fil
  // d'Ariane et titre), resté 16 px plus large que le reste jusqu'à ce que le
  // porteur du projet demande la colonne parfaitement homogène.
  //
  // « Aller plus loin » partage la même règle CSS que cet en-tête, mais ne se
  // mesure pas : `furtherReading` (src/lib/site-highlights.ts) est vide à la
  // livraison, donc la section ne rend rien nulle part — ici, en dev ou en
  // production. Elle est donc lue si elle existe, et le jour où cette table
  // sera remplie ce cas la couvrira sans retouche ; en attendant, c'est
  // l'épingle CSS (reference-styles.test.ts) qui tient sa largeur.
  await page.goto("/tools/villes");
  const tools = await page.evaluate(() => {
    const width = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? element.getBoundingClientRect().width : null;
    };
    return {
      band: width(".selection-banner"),
      panel: width(".player-settings"),
      head: width(".tool-page-head"),
      furtherReading: width(".further-reading"),
      main: width("main.public-main")!,
    };
  });
  // Les trois qui rendent toujours : leur absence est un échec, pas un saut.
  for (const name of ["band", "panel", "head"] as const) {
    expect(tools[name], `${name} missing`).not.toBeNull();
  }
  for (const [name, measured] of Object.entries(tools)) {
    if (measured === null) continue;
    expect(
      Math.abs(measured - tools.main),
      `${name} vs main`,
    ).toBeLessThanOrEqual(1);
  }

  // Le bandeau des référentiels : même composant, même page-type, même règle.
  await page.goto("/referentiels/level-up");
  const references = await page.evaluate(() => {
    const width = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect().width;
    return {
      band: width(".selection-banner"),
      main: width("main.public-main"),
    };
  });
  expect(
    Math.abs(references.band - references.main),
    "references band vs main",
  ).toBeLessThanOrEqual(1);
});

/**
 * Point E — le niveau et les VP, rééquilibrés sur mobile.
 *
 * Constat : « le champ VP est tronqué à un caractère ». Il tombait à 16 px,
 * coincé entre ses boutons de 40 px et le sélecteur d'unité, pendant que le
 * niveau en gardait 72 pour trois chiffres. Les deux sont donc mesurés
 * ensemble, à l'unité T et avec la valeur la plus large que le champ accepte —
 * corriger l'un en écrasant l'autre passerait, sinon.
 */
test("Bloc 139/E: on a phone, Niveau and VP both show their value whole, buttons still tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPanel(page, "/tools/villes");

  await page
    .getByRole("spinbutton", { name: "Niveau du joueur", exact: true })
    .fill("250");
  await page
    .getByRole("combobox", { name: "Unité des VP" })
    .selectOption("1000000000000");
  await page
    .getByRole("spinbutton", { name: "VP du joueur", exact: true })
    .fill("123.4");

  const fields = await page.locator(".player-general").evaluate((row) => {
    const read = (label: string) => {
      const input = [...row.querySelectorAll("input")].find(
        (candidate) => candidate.getAttribute("aria-label") === label,
      )!;
      const buttons = [
        ...input.closest(".num-stepper")!.querySelectorAll("button"),
      ];
      const box = (element: Element) => element.getBoundingClientRect();
      return {
        field: box(input).width,
        clipped: input.scrollWidth > input.clientWidth + 1,
        buttonWidth: Math.min(...buttons.map((button) => box(button).width)),
        buttonHeight: Math.min(...buttons.map((button) => box(button).height)),
      };
    };
    return { level: read("Niveau du joueur"), vp: read("VP du joueur") };
  });

  // Les deux valeurs entières : le constat pour les VP, la non-régression
  // pour le niveau.
  expect(fields.vp.clipped, "VP clipped at unit T").toBe(false);
  expect(fields.level.clipped, "Niveau clipped").toBe(false);
  // Rééquilibrés, et non l'un au détriment de l'autre : les deux champs se
  // tiennent à moins d'un quart l'un de l'autre, là où le rapport était de
  // 1 à 4,5 (72 px contre 16).
  const ratio =
    Math.max(fields.level.field, fields.vp.field) /
    Math.min(fields.level.field, fields.vp.field);
  expect(ratio, "Niveau/VP width ratio").toBeLessThan(1.25);
  // Les boutons ont maigri — c'est de là que vient la place…
  expect(fields.vp.buttonWidth).toBeLessThan(40);
  // … sans descendre sous le minimum de cible de la WCAG 2.2 (2.5.8, AA :
  // 24 × 24 px), et en gardant les 44 px de haut que le site se donne.
  for (const [name, measured] of Object.entries(fields)) {
    expect(measured.buttonWidth, `${name} button width`).toBeGreaterThanOrEqual(
      24,
    );
    expect(
      measured.buttonHeight,
      `${name} button height`,
    ).toBeGreaterThanOrEqual(44);
  }
});

/**
 * Bloc 140 — la hauteur des champs des templiers, égale à celle des champs de
 * la matrice.
 *
 * Le cas vit dans ce fichier parce que c'est le même sujet et la même méthode
 * que les quatre précédents : une dimension du bandeau déplié, lue dans un
 * vrai navigateur et comparée à une autre dimension plutôt qu'à un littéral.
 *
 * Les deux zones se lisent sur le même écran, l'une au-dessus de l'autre, et
 * leurs champs n'avaient pas la même hauteur : ceux des templiers retombaient
 * sur celle que le site donne à tout `input` public (40,8 px), quand ceux de
 * la matrice portaient leur hauteur compacte (32 px).
 *
 * Les deux largeurs comptent, et pour des raisons différentes : en desktop
 * c'est l'écart à corriger, en mobile c'est une égalité déjà acquise (les deux
 * zones y partagent la forme sans boutons) qu'un correctif mal ciblé casserait.
 */
test("Bloc 140: the templars fields are exactly as tall as the matrix fields", async ({
  page,
}) => {
  for (const [label, width] of [
    ["desktop", 1440],
    ["mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1100 });
    await openPanel(page, "/tools/villes");

    const measured = await page.evaluate(() => {
      const height = (element: Element | null) =>
        element ? element.getBoundingClientRect().height : null;
      // La matrice, dans la présentation qui est à l'écran à cette largeur.
      const matrix =
        document.querySelector(".player-matrix") ??
        document.querySelector(".player-matrix-mobile");
      const templarButtons = [
        ...document.querySelectorAll(".player-templars-fields button"),
      ].map((button) => {
        const box = button.getBoundingClientRect();
        return { w: box.width, h: box.height };
      });
      return {
        templars: height(
          document.querySelector(".player-templars-fields input"),
        ),
        matrix: height(matrix?.querySelector("tbody input") ?? null),
        templarButtons,
      };
    });

    expect(measured.templars, `${label}: no templars field`).not.toBeNull();
    expect(measured.matrix, `${label}: no matrix field`).not.toBeNull();
    // Égalité mesurée, au pixel près — pas « visuellement proche ».
    expect(
      Math.abs(measured.templars! - measured.matrix!),
      `${label}: templars ${measured.templars} vs matrix ${measured.matrix}`,
    ).toBeLessThanOrEqual(1);

    // Les boutons − / + des templiers restent des cibles : le minimum de la
    // WCAG 2.2 (2.5.8, niveau AA) est 24 × 24 px. En mobile le champ n'en a
    // aucun — c'est la forme sans boutons, comme la matrice — donc la boucle
    // ne porte sur rien, ce qui est le résultat attendu et non un oubli.
    expect(measured.templarButtons.length, `${label}: templars buttons`).toBe(
      width >= 901 ? 10 : 0,
    );
    for (const button of measured.templarButtons) {
      expect(button.w, `${label}: button width`).toBeGreaterThanOrEqual(24);
      expect(button.h, `${label}: button height`).toBeGreaterThanOrEqual(24);
    }
  }
});
