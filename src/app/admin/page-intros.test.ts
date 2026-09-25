import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fr from "../../../messages/fr.json";
import en from "../../../messages/en.json";

/**
 * Bloc 131/D : plus de ligne d'introduction sous le titre, en admin.
 *
 * Chaque écran en portait une, et chacune redisait ce que l'écran montre
 * déjà — « Les comptes qui peuvent ouvrir l'administration. » au-dessus de la
 * table des comptes, « Ajoute, renomme, réordonne et active les ligues et
 * divisions » au-dessus de la liste des ligues. Sur un outil qu'on ouvre
 * plusieurs fois par jour, une phrase qu'on a lue une fois n'est plus qu'une
 * ligne à sauter.
 *
 * Ce fichier tient les deux moitiés : les phrases ne sont plus dans les
 * paquets de traduction, et aucun en-tête ne reçoit plus de description. La
 * seconde compte autant que la première — une phrase écrite en dur passerait
 * sous le nez d'un test qui ne regarde que les paquets.
 */

const bundles = { fr, en } as Record<string, unknown>;
const source = (path: string) => readFileSync(path, "utf8");

/** Le corps d'un appel JSX `<Name … />` ou `<Name …>`, tel qu'il est écrit. */
function callsTo(code: string, component: string) {
  return [
    ...code.matchAll(
      new RegExp(`<${component}\\b[\\s\\S]*?(?:/>|\\n *>)`, "g"),
    ),
  ].map(([call]) => call);
}

/** Les huit phrases du brief, telles qu'elles étaient stockées. */
const removed = [
  "L’état du site, et ce qui reste à traiter.",
  "Les guides publiés sur le site, leurs traductions et leur statut.",
  "Puce pleine : version rédigée. Puce en pointillés : traduction à créer.",
  "Les tables de données du jeu, et l’outil qui s’en sert.",
  "Les outils publics, leur source de paramètres et leur visibilité.",
  "Les pages institutionnelles du site public.",
  "Les comptes qui peuvent ouvrir l’administration.",
  "Toutes les actions enregistrées dans l’administration.",
  "Les réglages du site public.",
];

/** Les huit pages de liste, et les écrans d'édition qui les prolongent. */
const listPages = [
  "src/app/admin/page.tsx",
  "src/app/admin/guides/page.tsx",
  "src/app/admin/referentiels/page.tsx",
  "src/app/admin/tools/page.tsx",
  "src/app/admin/content/page.tsx",
  "src/app/admin/users/page.tsx",
  "src/app/admin/logs/page.tsx",
  "src/app/admin/config/page.tsx",
];

const editors = [
  "src/components/admin-tool-editors.tsx",
  "src/components/admin-ranking-editor.tsx",
  "src/components/admin-equipment-editor.tsx",
  "src/components/admin-shop-editor.tsx",
  "src/components/admin-events-editor.tsx",
  "src/components/admin-templars-editor.tsx",
  "src/components/admin-progression-editor.tsx",
  "src/components/admin-guide-editor.tsx",
];

describe("Bloc 131/D — les textes d'introduction de l'admin", () => {
  it.each(removed)("a retiré « %s » des deux paquets", (sentence) => {
    for (const [locale, bundle] of Object.entries(bundles))
      expect(JSON.stringify(bundle), locale).not.toContain(sentence);
  });

  it("ne laisse aucune description sur les huit pages de liste", () => {
    for (const path of listPages) {
      const headers = callsTo(source(path), "PageHeader");
      expect(headers, path).toHaveLength(1);
      expect(headers[0], path).not.toMatch(/description=/);
      // Le reste de l'en-tête est intact : surtitre, titre, actions.
      expect(headers[0], path).toMatch(/title=/);
    }
  });

  it("ne laisse aucune description sur les écrans d'édition", () => {
    for (const path of editors)
      for (const header of callsTo(source(path), "EditorHeader"))
        expect(header, path).not.toMatch(/description=/);
  });

  /**
   * Le prop est retiré du composant, pas seulement de ses appelants : un
   * prop que plus personne ne passe revient tôt ou tard.
   */
  it("a retiré le prop de EditorHeader", () => {
    // Sans ses commentaires : celui qui explique le retrait contient le mot.
    const header = source("src/components/admin-editor-header.tsx").replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
      "",
    );
    expect(header).not.toMatch(/description/);
    // PageHeader le garde : Mon compte, hors des huit pages, s'en sert.
    expect(source("src/components/admin-page-header.tsx")).toMatch(
      /description\?: ReactNode;/,
    );
  });

  /**
   * La légende des puces de langue sous la table des Guides s'en va avec le
   * reste. Ce qu'elle expliquait ne se perd pas : depuis le Bloc 131/A,
   * chaque puce porte sa phrase entière.
   */
  it("a retiré la légende des puces sous la table des Guides", () => {
    expect(source("src/components/admin-guides-list.tsx")).not.toMatch(
      /t\("legend"\)/,
    );
  });
});
