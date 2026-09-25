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
 * La spécificité d'un sélecteur simple, en [classes, types] — assez pour les
 * sélecteurs de ce fichier, qui n'ont ni identifiant ni `:where()`. Les
 * pseudo-classes (`:last-child`) comptent comme des classes, comme le veut
 * la spécification.
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
 * Bloc 132 §7 : la ligne « Total N villes » des tableaux de Coût de ville et
 * de Production.
 *
 * Elle était déjà censée être violette depuis le Bloc 113, et elle ne l'était
 * plus : le Bloc 129 a donné un fond et une graisse à toutes les cellules du
 * pied (`.tool-table tfoot th`), plus spécifique que le `.tool-row-grand th`
 * qui portait la mise en évidence. La règle se lisait juste et ne rendait
 * rien.
 *
 * C'est pour ça que ce fichier vérifie la spécificité et pas seulement les
 * déclarations : un test qui cherche `background: var(--accent-soft)` dans le
 * fichier passe tout aussi bien quand la règle est écrasée.
 */
describe("Bloc 132 §7 — la ligne des N villes", () => {
  /**
   * La liste de sélecteurs telle qu'elle est écrite dans le fichier, relevée
   * par ce qu'elle déclare et non par ce qu'on croit qu'elle vaut : c'est
   * elle que la spécificité est censée départager, et l'écrire en dur ici
   * reviendrait à comparer deux constantes de ce test entre elles.
   */
  const grand = css.match(
    /(?<=\n)((?:\.[\w-]+ \.tool-row-grand \w+,?\n?)+) {\n  background: var\(--accent-soft\);/,
  )?.[1];

  it("l'emporte sur les règles du pied de tableau", () => {
    expect(grand, "la règle qui teinte la ligne").toBeDefined();
    for (const weaker of [
      ".tool-table tbody th,\n.tool-table tfoot th",
      ".tool-table tbody td,\n.tool-table tfoot td",
    ]) {
      expect(rule(weaker), weaker).toBeDefined();
      // Chaque sélecteur de la liste doit gagner, pas seulement le premier.
      for (const one of grand!.trim().split(",\n"))
        for (const other of weaker.split(",\n"))
          expect(beats(one, other), `${one} vs ${other}`).toBe(true);
    }
  });

  it("teinte la ligne aux jetons d'accent, dans les deux thèmes", () => {
    const body = rule(grand!.trim());
    expect(body).toBeDefined();
    expect(body).toMatch(/background: var\(--accent-soft\)/);
    expect(body).toMatch(/color: var\(--accent\)/);
    expect(body).toMatch(/font-weight: 600/);
    // Les deux jetons sont déclarés par thème : le §7 demande la mise en
    // évidence en clair comme en sombre, et c'est la palette qui l'assure.
    for (const block of [
      css.match(/:root,\s*:root\[data-theme="dark"\]\s*{([\s\S]*?)\n}/)?.[1],
      css.match(/:root\[data-theme="light"\]\s*{([\s\S]*?)\n}/)?.[1],
    ]) {
      expect(block).toMatch(/--accent-soft:\s*#[0-9a-f]{6};/i);
      expect(block).toMatch(/--accent-border:\s*#[0-9a-f]{6};/i);
    }
  });

  it("ferme la ligne d'un contour de 1 px et d'un filet de 4 px à gauche", () => {
    expect(rule(grand!.trim())).toMatch(
      /inset 0 1px 0 var\(--accent-border\),\n\s*inset 0 -1px 0 var\(--accent-border\)/,
    );
    expect(rule(".tool-table .tool-row-grand th")).toMatch(
      /inset 4px 0 0 var\(--accent\)/,
    );
    expect(rule(".tool-table .tool-row-grand td:last-child")).toMatch(
      /inset -1px 0 0 var\(--accent-border\)/,
    );
  });

  /**
   * En ombre intérieure, pas en bordure : une bordure élargirait les cellules
   * et décalerait le libellé par rapport aux lignes du dessus, la largeur des
   * colonnes restant commune à tout le tableau.
   */
  it("peint le filet sans déplacer le texte", () => {
    for (const selector of [
      grand!.trim(),
      ".tool-table .tool-row-grand th",
      ".tool-table .tool-row-grand td:last-child",
    ])
      expect(rule(selector), selector).not.toMatch(/\n\s*border(-\w+)?:/);
  });
});

describe("Bloc 132 §7 — les cartes de Récompenses de production", () => {
  it("sépare la ligne de saisie du résultat de 16 px", () => {
    expect(rule(".tool-reward-fields")).toMatch(/margin-bottom: 1rem/);
  });
});
