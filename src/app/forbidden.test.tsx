import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Forbidden from "./forbidden";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) =>
    ({
      eyebrow: "Accès",
      title: "Accès refusé",
      description: "Ce rôle n’a pas ce droit.",
      back: "Retour à l’administration",
    })[key],
}));

afterEach(cleanup);

/**
 * Bloc 132 §8, retour de revue : cette page prend l'apparence du bouton
 * secondaire du §2, mais pas le composant `Button`, qui passe par le `Link`
 * localisé de `@/i18n/navigation`.
 *
 * Elle est rendue sous une URL `/admin/…` sans préfixe de langue. Un lien
 * localisé y écrirait `/fr/admin`, que le proxy traite comme une route
 * publique traduite — où aucune page d'administration n'existe. C'est la
 * règle que `src/i18n/navigation.ts` énonce et que tout le reste de
 * l'administration suit.
 */
describe("Forbidden", () => {
  it("renvoie vers /admin sans préfixe de langue", async () => {
    render(await Forbidden());
    expect(
      screen.getByRole("link", { name: "Retour à l’administration" }),
    ).toHaveAttribute("href", "/admin");
  });

  it("garde l'apparence du bouton secondaire", async () => {
    render(await Forbidden());
    expect(screen.getByRole("link")).toHaveClass("button-secondary");
  });

  // Le href seul ne suffit pas à tenir la règle : le `Link` localisé rend le
  // même attribut en test (le préfixe s'ajoute à l'exécution, à partir de la
  // locale demandée). C'est donc l'import qui est vérifié.
  it("passe par next/link, jamais par la navigation localisée", () => {
    const source = readFileSync("src/app/forbidden.tsx", "utf8");
    // Les modules importés, et rien d'autre : le commentaire du fichier
    // nomme `@/i18n/navigation` pour expliquer pourquoi il l'évite, et une
    // recherche dans le texte entier s'y arrêterait.
    const imported = [...source.matchAll(/\bfrom "([^"]+)"/g)].map(
      ([, module]) => module,
    );
    expect(imported).toContain("next/link");
    expect(imported).not.toContain("@/i18n/navigation");
    // `buttonClassName` vient bien de là ; c'est le composant `Button`,
    // qui rend le lien localisé, qui n'a rien à faire ici.
    expect(source).not.toMatch(/import \{[^}]*\bButton\b[^}]*\} from/);
  });
});
