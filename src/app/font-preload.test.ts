import { describe, expect, it, vi } from "vitest";

const declarations: Record<string, unknown>[] = [];
// La doublure globale (vitest.setup.ts) jette ses arguments ; celle-ci les
// garde, puisque c'est précisément ce que ce fichier vérifie.
vi.mock("next/font/local", () => ({
  default: (options: Record<string, unknown>) => {
    declarations.push(options);
    return { className: "", variable: "", style: {} };
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "fr",
  getMessages: async () => ({}),
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/site-settings", () => ({
  getTrackingSettings: async () => ({ url: "", websiteId: "" }),
}));

const familles = async () => {
  await import("@/app/layout");
  return Object.fromEntries(declarations.map((d) => [d.variable as string, d]));
};

/**
 * Ce que chaque page télécharge avant d'afficher quoi que ce soit.
 *
 * `preload` vaut `true` par défaut et porte sur toute une famille : les huit
 * fichiers des trois familles (176 Ko) partaient donc sur chaque page.
 * Mesuré au navigateur sur un build de production : les écrans d'outils
 * n'utilisent que deux fontes, Configuration trois, et la chasse fixe
 * n'apparaît que sur six pages sur douze — jamais dans le premier texte lu.
 * Firefox le disait à sa façon, huit fois de suite dans la console :
 * « préchargée avec le préchargement de lien n'a pas été utilisée ».
 */
describe("préchargement des polices", () => {
  it("ne précharge pas la chasse fixe", async () => {
    const { "--font-mono": mono } = await familles();
    expect(mono.preload).toBe(false);
  });

  /**
   * Les deux autres servent le texte courant et les titres de toutes les
   * pages mesurées : les couper coûterait un aller-retour sur le premier
   * texte lu, ce que le bruit dans la console ne justifie pas.
   */
  it("garde le préchargement du texte courant et des titres", async () => {
    const polices = await familles();
    expect(polices["--font-sans"].preload).toBeUndefined();
    expect(polices["--font-serif"].preload).toBeUndefined();
  });

  it("déclare les trois familles du site", async () => {
    expect(Object.keys(await familles())).toEqual([
      "--font-sans",
      "--font-serif",
      "--font-mono",
    ]);
  });
});
