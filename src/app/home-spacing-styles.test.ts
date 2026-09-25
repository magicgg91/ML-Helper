import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

/** Le corps de la règle dont la liste de sélecteurs est exactement `selector`. */
function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(
    new RegExp(`(?<=\\n)(?<!,\\n)${escaped}\\s*{([\\s\\S]*?)\\n}`),
  )?.[1];
}

/**
 * Le fichier sans ses commentaires. Un commentaire n'a pas d'accolade : le
 * balayage ci-dessous le prendrait pour le début d'une liste de sélecteurs
 * et lirait la règle qui suit sous un nom qui n'est pas le sien.
 */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Tous les corps de règle qui visent `selector`, où qu'ils soient écrits —
 * y compris dans une media query, et y compris quand le sélecteur partage
 * sa règle avec d'autres.
 *
 * Chercher la règle nommée ne suffit pas ici : ce fichier vérifie qu'une
 * déclaration *n'existe nulle part*, et une marge réintroduite plus bas dans
 * une media query passerait sous le nez d'une recherche par règle unique.
 */
/**
 * Les noms des propriétés déclarées dans un corps de règle.
 *
 * Chercher `margin` à l'expression régulière dans le corps rate la première
 * déclaration de la règle — il n'y a ni `;` ni `{` devant elle — et c'est
 * exactement là qu'on ajoute une marge quand on en rajoute une. Découper le
 * corps ne rate rien.
 */
function properties(body: string) {
  return body
    .split(";")
    .map((one) => one.trim().split(":")[0]?.trim() ?? "")
    .filter(Boolean);
}

/** Vrai si la règle déclare `prop`, seule ou en variante (`margin-top`). */
const declares = (body: string, prop: string) =>
  properties(body).some((one) => one === prop || one.startsWith(`${prop}-`));

function bodiesFor(selector: string) {
  const bodies: string[] = [];
  // Règles feuilles seulement : un corps sans accolade, donc jamais le
  // corps d'une media query (dont le préfixe commence par « @ », exclu).
  for (const [, selectors, body] of bare.matchAll(
    /(?<=\n)[ \t]*([^{}@][^{}]*?)\s*{([^{}]*)}/g,
  ))
    if (selectors.split(",").some((one) => one.trim() === selector))
      bodies.push(body);
  return bodies;
}

/**
 * La spécificité d'un sélecteur simple, en [classes, types] — même helper
 * que `tool-table-styles.test.ts`, pour la même raison : une règle plus
 * faible se lit juste et ne rend rien.
 */
function specificity(selector: string): [number, number] {
  const classes = (selector.match(/[.:]\w[\w-]*/g) ?? []).length;
  const types = (selector.match(/(^|[\s>+~])[a-z]+\b/g) ?? []).length;
  return [classes, types];
}

const beats = (a: string, b: string) => {
  const [ac, at] = specificity(a);
  const [bc, bt] = specificity(b);
  return ac > bc || (ac === bc && at > bt);
};

/**
 * Bloc 134 — le rythme vertical de l'accueil.
 *
 * La page empilait deux mécanismes d'espacement : une marge haute sur chaque
 * bloc (`clamp(3rem, 7vw, 6rem)`, soit 90 px à 1280) et, pour le hero, un
 * rembourrage vertical de 51 px par-dessus — 141 px de vide entre le hero et
 * la première section. Le Bloc 134 n'en garde qu'un, le `gap` de la colonne.
 *
 * Ce qui casserait la correction, ce n'est pas une valeur mal choisie : c'est
 * le retour d'un second mécanisme, une marge remise sur un bloc « pour
 * aérer ». Les valeurs sont donc tenues une fois, sur les jetons, et le reste
 * du fichier vérifie surtout qu'aucun bloc de l'accueil ne porte plus de
 * marge propre.
 */
describe("Bloc 134 — les jetons d'espacement de l'accueil", () => {
  it("nomme les quatre écarts une seule fois, avec leur repli mobile", () => {
    const tokens = {
      "--space-section": ["3.5rem", "2.25rem"],
      "--space-page-top": ["2.5rem", "1.5rem"],
      "--space-page-bottom": ["4rem", "2.5rem"],
      "--space-section-head": ["1.5rem", "1.25rem"],
    };
    for (const [token, [wide, narrow]] of Object.entries(tokens)) {
      // Deux déclarations exactement : la valeur de base et son repli. Une
      // troisième, ce serait un réglage qui dépend d'où on regarde.
      const declared = css.match(new RegExp(`${token}:`, "g")) ?? [];
      expect(declared, token).toHaveLength(2);
      expect(css, token).toContain(`${token}: ${wide};`);
      expect(css, token).toContain(`  ${token}: ${narrow};`);
    }
  });

  /**
   * Le repli est écrit juste après la base : à spécificité égale c'est la
   * dernière règle du fichier qui gagne, media query ou pas (Bloc 25).
   */
  it("écrit le repli mobile après la valeur de base", () => {
    const base = css.indexOf("  --space-section: 3.5rem;");
    const narrow = css.indexOf("    --space-section: 2.25rem;");
    expect(base).toBeGreaterThan(-1);
    expect(narrow).toBeGreaterThan(base);
    expect(css.slice(base, narrow)).toContain("@media (max-width: 48rem) {");
  });
});

describe("Bloc 134 — un seul mécanisme entre les blocs", () => {
  /**
   * L'écart entre les blocs vient du conteneur, pas des blocs. Les deux
   * classes plutôt qu'une : `.public-main` pose la marge de toutes les
   * pages, et à spécificité égale ce serait l'ordre du fichier qui
   * trancherait.
   */
  it("pose le `gap` sur la colonne de la page, et rien d'autre", () => {
    const page = rule(".public-main.home-page");
    expect(page).toBeDefined();
    expect(page).toMatch(/display: flex/);
    expect(page).toMatch(/flex-direction: column/);
    expect(page).toMatch(/gap: var\(--space-section\)/);
    expect(page).toMatch(/margin-top: var\(--space-page-top\)/);
    expect(page).toMatch(/margin-bottom: var\(--space-page-bottom\)/);
    // Le second mécanisme que la consigne interdit : un rembourrage sur le
    // conteneur, qui s'ajouterait au `gap` en haut et en bas.
    expect(declares(page as string, "padding")).toBe(false);
    expect(beats(".public-main.home-page", ".public-main")).toBe(true);
  });

  /**
   * Le cœur du bloc : aucun des quatre blocs de l'accueil ne porte de marge
   * propre. C'est la seule façon de garantir qu'il n'existe qu'un écart —
   * une marge et un `gap` ne fusionnent pas, ils s'additionnent.
   */
  it.each([
    [".home-hero"],
    [".home-section"],
    [".home-section-head"],
    [".report-banner"],
  ])("ne laisse aucune marge sur %s", (selector) => {
    const bodies = bodiesFor(selector);
    expect(bodies.length, selector).toBeGreaterThan(0);
    for (const body of bodies)
      expect(declares(body, "margin"), `${selector} : ${body}`).toBe(false);
  });

  /**
   * Le hero, en plus : ni rembourrage vertical ni hauteur imposée. Sa
   * hauteur suit son contenu — c'est ce que la consigne appelle « pas de
   * min-height sur le hero ».
   */
  it("laisse la hauteur du hero à son contenu", () => {
    for (const body of bodiesFor(".home-hero")) {
      expect(declares(body, "padding"), body).toBe(false);
      expect(
        properties(body).some((one) => /^(?:min-)?height$/.test(one)),
        body,
      ).toBe(false);
    }
  });

  /**
   * Les grilles de cartes portent leur propre marge haute et servent aussi
   * hors de l'accueil : elle est neutralisée dans la section, pas supprimée
   * de la grille. Ce qui compte alors, c'est que la règle gagne — celle de
   * la grille est écrite plus loin dans le fichier, donc l'ordre ne suffit
   * pas, seule la spécificité tranche.
   */
  it("neutralise la marge des grilles à l'intérieur d'une section", () => {
    expect(rule(".home-page .home-section > *")).toMatch(/margin-top: 0/);
    expect(beats(".home-page .home-section > *", ".tool-category-grid")).toBe(
      true,
    );
  });
});

/**
 * Le pied de page apporte 64 px de marge haute sur tout le site. Adjacente à
 * la marge basse de la page, les deux fusionnent au plus grand des deux :
 * l'accueil affichait 64 px en bas quelle que soit la largeur, là où il en
 * demande 40 sur mobile. La marge du pied cède, la page décide.
 */
describe("Bloc 134 — le bas de page", () => {
  it("laisse `--space-page-bottom` seul après l'accueil", () => {
    expect(rule(".home-page + .public-footer")).toMatch(/margin-top: 0/);
    for (const [, selectors] of bare.matchAll(
      /(?<=\n)([^{}@][^{}]*?)\s*{[^{}]*margin-top: 4rem;/g,
    ))
      for (const one of selectors.split(",").map((s) => s.trim()))
        if (one.includes(".public-footer"))
          expect(beats(".home-page + .public-footer", one), one).toBe(true);
  });

  // Les autres pages gardent la marge du pied : la règle est adjacente à
  // `.home-page`, elle ne s'applique nulle part ailleurs.
  it("garde la marge du pied sur les autres pages", () => {
    expect(rule(".public-footer")).toMatch(/margin-top: 4rem/);
  });
});
