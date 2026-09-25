import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

/**
 * Le corps de la règle CSS dont la liste de sélecteurs est exactement
 * `selector`.
 *
 * Le lookbehind compte : « .button-secondary » apparaît aussi au milieu de
 * « .button-primary,\n.button-secondary { … } », et sans lui on lirait le
 * corps du groupe en croyant lire celui de la variante.
 */
function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(
    new RegExp(`(?<=\\n)(?<!,\\n)${escaped}\\s*{([\\s\\S]*?)\\n}`),
  )?.[1];
}

/**
 * Bloc 132 §1 et §2 : la forme des commandes publiques.
 *
 * Le Bloc 129 les avait toutes dessinées en pilule. La recette demande des
 * rectangles à coins arrondis de 10 px partout — sauf le champ de recherche,
 * resté en pilule et explicitement hors périmètre. Ce sont deux décisions
 * opposées sur le même écran, faciles à réunifier par mégarde plus tard :
 * ce fichier les tient séparées.
 */
describe("Bloc 132 §1 — l'en-tête public", () => {
  it("nomme la forme des commandes une seule fois", () => {
    const root = rule(":root");
    expect(root).toBeDefined();
    expect(root).toMatch(/--header-control-h: 2\.5rem;/);
    expect(root).toMatch(/--header-control-radius: 0\.625rem;/);
    expect(root).toMatch(/--header-control-pad: 1rem;/);
  });

  it("donne cette forme aux entrées de navigation, à la langue et au thème", () => {
    for (const selector of [
      ".public-header-nav a",
      ".theme-toggle",
      ".locale-select",
    ]) {
      const body = rule(selector);
      expect(body, selector).toBeDefined();
      expect(body, selector).toMatch(
        /border-radius: var\(--header-control-radius\)/,
      );
      expect(body, selector).toMatch(/var\(--header-control-h\)/);
    }
  });

  it("habille l'état inactif en fond de champ, contour fort et texte secondaire", () => {
    const nav = rule(".public-header-nav a");
    expect(nav).toMatch(/border: 1px solid var\(--strong\)/);
    expect(nav).toMatch(/background: var\(--field\)/);
    expect(nav).toMatch(/color: var\(--text2\)/);
    expect(nav).toMatch(/font-weight: 600/);
  });

  // L'état actif est le seul que le §1 laisse tel quel.
  it("garde l'état actif du Bloc 129", () => {
    const active = rule('.public-header-nav a[aria-current="page"]');
    expect(active).toMatch(/border-color: var\(--accent\)/);
    expect(active).toMatch(/background: var\(--accent-soft\)/);
    expect(active).toMatch(/color: var\(--accent\)/);
  });

  /**
   * Bloc 133 §D : l'inverse de ce que ce test gardait. Le Bloc 132 avait mis
   * la forme du champ de côté — point ouvert, non validé — et la pilule
   * restait seule de son espèce dans une rangée de rectangles. Le §D la
   * referme : le champ prend le rayon des commandes, celui du jeton, pas une
   * valeur recopiée.
   */
  it("donne au champ de recherche le rayon des commandes", () => {
    expect(rule(".site-search-label input")).toMatch(
      /border-radius: var\(--header-control-radius\)/,
    );
    // La pilule ne survit pas ailleurs dans la même règle.
    expect(rule(".site-search-label input")).not.toMatch(/999px/);
  });

  it("n'a plus de sous-titre de marque", () => {
    expect(css).not.toMatch(/\.brand-tagline/);
    expect(rule(".brand-name")).toMatch(/font-size: 1\.875rem/);
  });

  // Le `subdued` du Bloc 129 §2.1 mettait Contact en retrait ; les quatre
  // entrées sont à égalité maintenant, et la classe ne doit pas survivre
  // sans rendu.
  it("ne garde aucune entrée de navigation en retrait", () => {
    expect(css).not.toMatch(/\.public-nav-subdued/);
  });
});

describe("Bloc 132 §2 — le bouton partagé", () => {
  it("donne aux trois variantes le rayon de l'en-tête", () => {
    const shared = rule(".button-primary,\n.button-secondary,\n.button-toggle");
    expect(shared).toBeDefined();
    expect(shared).toMatch(/border-radius: var\(--header-control-radius\)/);
  });

  it("dessine le secondaire comme une entrée inactive de l'en-tête", () => {
    const secondary = rule(".button-secondary");
    expect(secondary).toMatch(/border-color: var\(--strong\)/);
    expect(secondary).toMatch(/background: var\(--field\)/);
    expect(secondary).toMatch(/color: var\(--text2\)/);
    // Le contour violet du Bloc 129 laisse la place au contour gris.
    expect(secondary).not.toMatch(/var\(--accent\)/);
  });

  it("allume un bouton de sélection comme une entrée active", () => {
    const pressed = rule('.button-toggle[aria-pressed="true"]');
    expect(pressed).toMatch(/border-color: var\(--accent\)/);
    expect(pressed).toMatch(/background: var\(--accent-soft\)/);
    expect(pressed).toMatch(/color: var\(--accent\)/);
  });

  // Cibles tactiles : 48 px pour une action de page, 44 px pour un choix
  // dans un groupe — le plancher WCAG 2.5.8 est à 24 px, la consigne du
  // prompt à 44.
  it("garde des hauteurs cliquables au doigt", () => {
    expect(rule(".button-primary,\n.button-secondary")).toMatch(
      /min-height: 3rem/,
    );
    expect(rule(".button-toggle")).toMatch(/min-height: 2\.75rem/);
  });

  // Les styles propres que chaque bouton portait avant le composant partagé
  // n'ont pas à survivre : deux sources pour une même forme, c'est la
  // divergence garantie.
  it("ne garde plus les styles de bouton d'avant", () => {
    expect(css).not.toMatch(/\.contact-subject-pill\s*{/);
    expect(css).not.toMatch(/\.report-error-primary/);
  });
});

describe("Bloc 132 §3 — l'en-tête mobile", () => {
  const mobile = css.match(/@media \(max-width: 42rem\) {([\s\S]*?)\n}\n/)?.[1];

  it("tient sur une seule ligne de 64 px", () => {
    expect(mobile).toMatch(/\.public-header {[\s\S]*?flex-wrap: nowrap;/);
    expect(mobile).toMatch(/\.public-header {[\s\S]*?min-height: 4rem;/);
  });

  it("nomme la cible tactile une fois, à 44 px", () => {
    expect(rule(":root")).toMatch(/--tap-target: 2\.75rem;/);
    expect(rule(".public-header-icon")).toMatch(
      /width: var\(--tap-target\);\n\s*height: var\(--tap-target\);/,
    );
  });

  /**
   * Le champ de recherche et la navigation partagent un parent, effacé sur
   * desktop. C'est ce qui permet un seul champ dans la page : deux champs,
   * ce serait deux états de saisie et deux listes de résultats.
   */
  it("efface le panneau sur desktop et le déroule sur mobile", () => {
    expect(rule(".public-header-panel")).toMatch(/display: contents/);
    expect(mobile).toMatch(
      /\.public-header-panel {[\s\S]*?position: absolute;/,
    );
    expect(mobile).toMatch(
      /\.public-header\[data-open="true"\] \.public-header-panel {\n\s*display: flex;/,
    );
  });

  // 16 px de texte : en dessous, iOS zoome sur le champ au focus et décale
  // la page entière.
  it("donne au champ du panneau 48 px et 16 px de texte", () => {
    expect(mobile).toMatch(
      /\.public-header-panel \.site-search-label input {[\s\S]*?height: 3rem;[\s\S]*?font-size: 1rem;/,
    );
  });

  /**
   * Ces trois-là vivent dans une media query à part, écrite après leurs
   * règles de base : à spécificité égale c'est la dernière du fichier qui
   * gagne, media query ou pas. Le test garde l'ordre autant que les valeurs.
   */
  it("passe la nav à 52 px et les commandes à la cible tactile, après leurs bases", () => {
    const navBase = css.indexOf(".public-header-nav a {");
    const localeBase = css.indexOf(".locale-select {");
    const override = css.indexOf(
      "@media (max-width: 42rem) {\n  .public-header-nav a {",
    );
    expect(override).toBeGreaterThan(navBase);
    expect(override).toBeGreaterThan(localeBase);
    const late = css.slice(override);
    expect(late).toMatch(
      /\.public-header-nav a {\n\s*\/\*[\s\S]*?height: 3\.25rem;/,
    );
    expect(late).toMatch(/\.theme-toggle {\n\s*width: var\(--tap-target\);/);
  });

  it("allume le bouton menu quand le panneau est ouvert", () => {
    const open = rule('.public-header[data-open="true"] .public-header-menu');
    expect(open).toMatch(/background: var\(--accent-soft\)/);
    expect(open).toMatch(/color: var\(--accent\)/);
  });
});

/**
 * Bloc 132 §8 : le bandeau de sélection, une seule forme pour les deux
 * rangées — catégories d'outils et référentiels.
 *
 * Le §8 donne des valeurs précises (16/12/10 px de rayon, 10/6 px de
 * remplissage, 52 px de haut) parce que les deux bandeaux avaient dérivé
 * l'un de l'autre sur exactement ces valeurs-là. Elles sont donc tenues
 * une par une, sur l'unique jeu de règles que les deux partagent
 * désormais.
 */
describe("Bloc 132 §8 — le bandeau de sélection", () => {
  it("emboîte un cadre de 16 px et une bande creuse de 12 px", () => {
    const frame = rule(".selection-banner");
    expect(frame).toMatch(/border: 1px solid var\(--border\)/);
    expect(frame).toMatch(/border-radius: 1rem/);
    expect(frame).toMatch(/background: var\(--surface\)/);
    expect(frame).toMatch(/padding: 0\.625rem/);

    const band = rule(".selection-banner-band");
    expect(band).toMatch(/background: var\(--sunk\)/);
    expect(band).toMatch(/border-radius: 0\.75rem/);
    expect(band).toMatch(/padding: 0\.375rem/);
    expect(band).toMatch(/gap: 0\.375rem/);
  });

  // Quatre catégories, sept référentiels : le composant passe le nombre,
  // la feuille de style ne le connaît pas.
  it("prend son nombre de colonnes du composant", () => {
    expect(rule(".selection-banner-band")).toMatch(
      /grid-template-columns: repeat\(var\(--selection-columns\), minmax\(0, 1fr\)\)/,
    );
  });

  it("dessine un onglet de 52 px, inactif en texte secondaire", () => {
    const tab = rule(".selection-tab");
    expect(tab).toMatch(/min-height: 3\.25rem/);
    expect(tab).toMatch(/border-radius: 0\.625rem/);
    expect(tab).toMatch(/background: transparent/);
    expect(tab).toMatch(/color: var\(--text2\)/);
  });

  it("allume l'onglet ouvert comme une entrée active de l'en-tête", () => {
    const current = rule('.selection-tab[aria-current="page"]');
    expect(current).toMatch(/border-color: var\(--accent\)/);
    expect(current).toMatch(/background: var\(--raised\)/);
    expect(current).toMatch(/color: var\(--accent\)/);
  });

  /**
   * Sur mobile le cadre et la bande ne disparaissent pas : les trois rayons
   * rétrécissent ensemble — 14, 10 et 8 px — pour que l'emboîtement reste
   * lisible à cette taille. Bloc 133 §B : les onglets s'y rangent en deux
   * colonnes au lieu d'y défiler.
   */
  it("resserre les trois rayons sur mobile", () => {
    const narrow = css.slice(
      css.indexOf("@media (max-width: 48rem) {\n  .selection-banner {"),
    );
    expect(narrow).toMatch(
      /\.selection-banner {[\s\S]*?border-radius: 0\.875rem;/,
    );
    expect(narrow).toMatch(
      /\.selection-banner-band {[\s\S]*?border-radius: 0\.625rem;/,
    );
    expect(narrow).toMatch(/\.selection-tab {[\s\S]*?border-radius: 0\.5rem;/);
  });

  /**
   * Bloc 133 §B/§C : l'onglet qui porte une pastille se resserre encore
   * sous 375 px, où « Compétences » et son chiffre ne tiennent plus dans
   * une demi-largeur. Mesuré au navigateur : 82 px voulus contre 81 à
   * 375 px et 77 à 360 px, d'où deux paliers plutôt qu'un.
   */
  it("resserre l'onglet compté sur les écrans les plus étroits", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 23.4375rem) {"));
    expect(narrow).toMatch(
      /\.selection-tab-counted {\n\s*padding: 0\.375rem 0\.375rem;/,
    );
    expect(narrow).toMatch(
      /\.selection-tab-counted \.selection-tab-title {\n\s*gap: 0\.25rem;/,
    );
    const tiny = css.slice(css.indexOf("@media (max-width: 22.5rem) {"));
    expect(tiny).toMatch(
      /\.selection-tab-counted \.selection-tab-thumb {\n\s*width: 1\.25rem;/,
    );
    // Les deux paliers viennent après le bloc de 48 rem qu'ils corrigent.
    expect(css.indexOf("@media (max-width: 23.4375rem) {")).toBeGreaterThan(
      css.indexOf("@media (max-width: 48rem) {\n  .selection-banner {"),
    );
  });

  // Le chiffre ne se coupe jamais : c'est le nom qui cède, un nom abrégé se
  // devine, un chiffre tronqué ne veut rien dire.
  it("garde la pastille entière et abrège le nom", () => {
    const narrow = css.slice(
      css.indexOf("@media (max-width: 48rem) {\n  .selection-banner {"),
    );
    expect(narrow).toMatch(
      /\.selection-tab-counted \.selection-tab-label {[\s\S]*?text-overflow: ellipsis;/,
    );
    expect(rule(".tool-count-badge")).toMatch(/flex: none/);
  });

  /**
   * La rangée des outils de la catégorie est devenue une carte à part,
   * sous le bandeau — même surface et même rayon que lui, mais son onglet
   * actif est souligné plutôt qu'encadré : deux états actifs identiques
   * l'un au-dessus de l'autre ne se distingueraient plus.
   */
  it("fait de la rangée des outils une carte, soulignée sous l'onglet actif", () => {
    const card = rule(
      ".selection-banner + main .calculator-tabs,\n.selection-banner ~ main .calculator-tabs",
    );
    expect(card).toMatch(/border: 1px solid var\(--border\)/);
    expect(card).toMatch(/border-radius: 1rem/);
    expect(card).toMatch(/background: var\(--surface\)/);
    expect(
      rule(
        '.selection-banner ~ main .calculator-tabs button[aria-selected="true"]',
      ),
    ).toMatch(/border-bottom-color: var\(--accent\)/);
    expect(rule(".selection-banner ~ main .calculator-tabs button")).toMatch(
      /border-bottom: 3px solid transparent/,
    );
  });
});

/**
 * Bloc 132 §9 : les cartes de l'index des guides, cliquables en entier.
 *
 * Le recouvrement étiré n'est pas un détail de style : il remplace le
 * bouton retiré et la carte-lien qu'on ne peut pas écrire (la pastille
 * « Outil » est un second lien, et on n'en imbrique pas deux). Il tient à
 * deux règles qui doivent rester ensemble — le parent positionné et le
 * `::after` qui le remplit.
 */
describe("Bloc 132 §9 — les cartes de guide", () => {
  it.each([
    ["mise en avant", ".guide-featured", ".guide-featured-copy h3 a::after"],
    ["simple", ".guide-card", ".guide-card-copy h3 a::after"],
  ])(
    "étire le lien du titre sur toute la carte %s",
    (_label, card, overlay) => {
      expect(rule(card), card).toMatch(/position: relative/);
      const after = rule(overlay);
      expect(after, overlay).toBeDefined();
      expect(after).toMatch(/position: absolute/);
      expect(after).toMatch(/inset: 0/);
    },
  );

  // La pastille passe au-dessus du recouvrement, sinon elle ouvrirait le
  // guide au lieu de l'outil.
  it("laisse la pastille Outil au-dessus du recouvrement", () => {
    const pill = rule(".guide-card-tool");
    expect(pill).toMatch(/position: relative/);
    expect(pill).toMatch(/z-index: 1/);
  });
});

/**
 * Bloc 132 §10 : la carte d'un référentiel sur mobile — image carrée, nom
 * en 15 px, description sur une seule ligne.
 */
describe("Bloc 132 §10 — l'index Référentiels sur mobile", () => {
  const narrow = css.slice(
    css.indexOf(
      "@media (max-width: 42rem) {\n  .reference-category-card .tool-category-copy h2 {",
    ),
  );

  // Écrit après la base qu'il remplace : à spécificité égale c'est la
  // dernière règle du fichier qui gagne, media query ou pas.
  it("rapetisse le nom à 15 px, après sa règle de base", () => {
    const base = css.indexOf(".tool-category-copy h2 {");
    expect(base).toBeGreaterThan(-1);
    expect(css.indexOf(narrow.slice(0, 60))).toBeGreaterThan(base);
    expect(narrow.slice(0, 200)).toMatch(/font-size: 0\.9375rem/);
  });

  it("coupe la description à une ligne", () => {
    expect(narrow).toMatch(
      /\.reference-category-card \.reference-card-description {[\s\S]*?white-space: nowrap;/,
    );
    expect(narrow).toMatch(
      /\.reference-category-card \.reference-card-description {[\s\S]*?text-overflow: ellipsis;/,
    );
  });
});

/**
 * Bloc 132 §10 : Contact sur mobile — le titre, l'intro, les trois
 * explications, puis le formulaire.
 *
 * Cet ordre est déjà celui du balisage : sur une colonne, la grille suit
 * le document. Ce qui le romprait, c'est un `order` ou un sens de
 * remplissage inversé glissé dans la règle mobile — c'est donc ça que ce
 * test refuse, et pas seulement la présence des blocs.
 */
describe("Bloc 132 §10 — Contact sur mobile", () => {
  it("empile la page dans l'ordre du document, formulaire en dernier", () => {
    const narrow = css.slice(
      css.indexOf(
        "  .contact-layout {\n    grid-template-columns: minmax(0, 1fr);",
      ),
    );
    const stacked = narrow.slice(0, narrow.indexOf("\n  }") + 4);
    expect(stacked).toMatch(/grid-template-columns: minmax\(0, 1fr\)/);
    expect(stacked).not.toMatch(/dense|column-reverse|row-reverse/);
    // `order` en début de déclaration seulement : `border:` contient la
    // même suite de lettres, et le chercher tel quel trouve tout le fichier.
    for (const [selector, body] of css.matchAll(
      /(?<=\n)(\.contact-[^{]*){([\s\S]*?)\n}/g,
    ))
      expect(body, selector).not.toMatch(/(?:^|[;{]\s*)order:/m);
  });
});

/**
 * Bloc 133 §C : le nombre d'outils, en pastille contre le nom.
 *
 * C'était une phrase grise à chasse fixe posée à côté du nom, assez longue
 * pour le repousser. Les valeurs ci-dessous sont celles de la maquette, et
 * elles ne varient pas avec l'état de l'onglet : un décompte n'est pas un
 * état, et le faire changer ferait croire à une seconde information.
 */
describe("Bloc 133 §C — la pastille du nombre d'outils", () => {
  it("dessine une pastille de 20 px, en accent sur accent doux", () => {
    const badge = rule(".tool-count-badge");
    expect(badge).toBeDefined();
    expect(badge).toMatch(/height: 1\.25rem/);
    expect(badge).toMatch(/min-width: 1\.25rem/);
    expect(badge).toMatch(/padding: 0 0\.375rem/);
    expect(badge).toMatch(/border-radius: 0\.375rem/);
    expect(badge).toMatch(/background: var\(--accent-soft\)/);
    expect(badge).toMatch(/color: var\(--accent\)/);
    expect(badge).toMatch(/font-family: var\(--font-mono, monospace\)/);
    expect(badge).toMatch(/font-size: 0\.75rem/);
    expect(badge).toMatch(/font-weight: 500/);
    // Le chiffre est centré dans la pastille, pas posé sur sa ligne de base.
    expect(badge).toMatch(/line-height: 1;/);
  });

  it("ne change pas de couleur selon l'état de l'onglet", () => {
    expect(css).not.toMatch(
      /\.selection-tab\[aria-current="page"\][^{]*\.tool-count-badge/,
    );
  });

  // Elle se pose contre le nom : les deux vivent dans un groupe, et c'est ce
  // groupe que le `gap` de l'onglet éloigne de la vignette, pas la pastille
  // du nom qu'elle compte.
  it("groupe le nom et la pastille, à 8 px l'un de l'autre", () => {
    const title = rule(".selection-tab-title");
    expect(title).toMatch(/display: inline-flex/);
    expect(title).toMatch(/align-items: center/);
    expect(title).toMatch(/gap: 0\.5rem/);
    expect(title).toMatch(/min-width: 0/);
  });
});
