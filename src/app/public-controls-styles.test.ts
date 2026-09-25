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

  // « Ne traite pas la forme du champ de recherche » — point ouvert non
  // validé, donc la pilule reste, seule de son espèce.
  it("laisse le champ de recherche en pilule", () => {
    expect(rule(".site-search-label input")).toMatch(/border-radius: 999px/);
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
