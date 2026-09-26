import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bloc 138/C — aucune couleur de l'admin ne peut nommer un jeton qui n'existe pas.
 *
 * La cause réelle du bouton violet du Classement : le Bloc 137 avait écrit
 * `text-admin-accent-ink` et `border-admin-accent-ink`, par symétrie avec les
 * paires `-soft` / `-soft-ink` qui existent, elles. Or aucun
 * `--color-admin-accent-ink` n'est déclaré. Tailwind n'engendre alors **rien** :
 * pas d'erreur de compilation, pas d'avertissement de lint, une classe inerte
 * dans le HTML, et un texte resté à la couleur héritée — mesuré à 1,94:1 sur ce
 * fond en thème clair, quand le WCAG 1.4.3 demande 4,5:1.
 *
 * Rien dans la chaîne ne dit non à une faute de frappe de ce genre : ni `tsc`,
 * ni ESLint, ni Prettier, ni les tests de rendu, qui ne regardent pas les
 * couleurs. D'où cette vérification, qui porte sur la classe de la faute et pas
 * sur ses deux occurrences : tout utilitaire de couleur `admin-*` du code livré
 * doit correspondre à un jeton déclaré dans `admin.css`.
 */

const adminCss = readFileSync(join(__dirname, "admin.css"), "utf8");
const srcRoot = join(process.cwd(), "src");

/**
 * Les jetons de couleur déclarés, c'est-à-dire ce que Tailwind sait engendrer :
 * `--color-admin-<nom>` donne `bg-admin-<nom>`, `text-admin-<nom>`, etc.
 */
const declared = new Set(
  [...adminCss.matchAll(/--color-admin-([a-z0-9-]+)\s*:/g)].map(
    (match) => match[1],
  ),
);

/**
 * Les préfixes qui lisent la palette. `rounded-`, `font-`, `h-` et les autres
 * lisent d'autres familles de jetons (rayons, familles, tailles) et ne sont donc
 * pas du ressort de ce cas.
 */
const colorUtility =
  /\b(?:bg|text|border|ring|outline|divide|fill|stroke|decoration|caret|shadow|from|via|to)-admin-([a-z0-9-]+)/g;

/**
 * Retire commentaires de bloc et de ligne. Indispensable, et pas cosmétique :
 * `admin-league-chip.ts` explique précisément la faute de ce bloc en la nommant,
 * et d'autres fichiers citent une classe pour dire pourquoi ils ne la prennent
 * pas. Sans ce nettoyage la règle accuserait le commentaire ; et comme ce
 * fichier-là existe, un nettoyage cassé fait tomber le cas au lieu de passer
 * inaperçu.
 */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry)) return [];
    // Un test peut nommer un jeton absent pour prouver qu'il l'est — c'est le
    // cas juste en dessous. La règle porte sur le code livré.
    if (/\.test\.tsx?$/.test(entry)) return [];
    return [relative(srcRoot, full).split("\\").join("/")];
  });
}

const files = sourceFiles(srcRoot).map((path) => ({
  path,
  code: withoutComments(readFileSync(join(srcRoot, path), "utf8")),
}));

describe("Bloc 138: admin colour utilities name a declared token", () => {
  it("reads the tokens and the sources at all", () => {
    // Un garde-fou sur le garde-fou : un balayage vide ferait passer la règle
    // pour de mauvaises raisons.
    expect(declared.size).toBeGreaterThan(20);
    expect(declared.has("accent-soft-ink")).toBe(true);
    expect(files.length).toBeGreaterThan(100);
    // Le nettoyage des commentaires fait son travail : le style partagé du
    // Classement nomme le jeton fautif dans sa doc, et nulle part ailleurs.
    const chip = files.find(
      ({ path }) => path === "components/admin-league-chip.ts",
    );
    expect(chip?.code).not.toContain("accent-ink");
  });

  it("finds no utility pointing at a token that does not exist", () => {
    const unknown = files.flatMap(({ path, code }) =>
      [...code.matchAll(colorUtility)]
        .map((match) => match[1])
        .filter((name) => !declared.has(name))
        .map((name) => `${path} → admin-${name}`),
    );
    expect(unknown).toEqual([]);
  });

  it("would catch the Bloc 137 typo", () => {
    // La faute elle-même, rejouée : sans ce cas, la règle ci-dessus pourrait
    // devenir aveugle (une expression cassée, un balayage vide) sans que rien
    // ne le dise.
    const faulty = 'className="bg-admin-accent text-admin-accent-ink"';
    const names = [...faulty.matchAll(colorUtility)].map((match) => match[1]);
    expect(names).toEqual(["accent", "accent-ink"]);
    expect(names.filter((name) => !declared.has(name))).toEqual(["accent-ink"]);
  });
});
