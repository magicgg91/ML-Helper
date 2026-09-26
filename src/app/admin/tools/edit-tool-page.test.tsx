import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditToolPage from "./[id]/page";
import { calculatorCatalog } from "@/lib/calculator-catalog";
import { toolParameterSource } from "@/lib/admin-tool-sources";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/admin-formulas-server", () => ({
  getTemplarParameters: async () => ({ base: 100, ratio: 1.1 }),
  getGemParameters: async () => ({ skillLeagueValue: {}, gemPrice: {} }),
}));
vi.mock("@/lib/templars-presentation-server", () => ({
  getTemplarPresentation: async () => ({}),
}));
// Bloc 119: the screens that are nothing but named numbers moved to their own
// module when they were rewritten on the refonte's components.
vi.mock("@/components/admin-tool-editors", () => ({
  CityParametersEditor: () => null,
  DemoAttackTroopsEditor: () => null,
  GemParametersEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
  XpGainRateEditor: () => null,
}));
// Bloc 119: the cost formula and the presentation catalog are one screen with
// one save, so there is a single component to stand in for.
vi.mock("@/components/admin-templars-editor", () => ({
  TemplarsEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
}));

let sessionRole = "super_admin";
vi.mock("@/auth/require-session", () => ({
  requireCapability: async () => ({
    user: { id: "u1", role: sessionRole, name: "Admin" },
  }),
}));

// Bloc 137 : le Classement n'a plus d'écran ici — son adresse redirige vers la
// section de Configuration qui porte les ligues et les divisions. Les deux
// sorties de `next/navigation` lèvent, comme dans Next, pour que le test voie
// laquelle a été prise et s'arrête là où la page s'arrête.
const navigation = vi.hoisted(() => ({
  redirects: [] as string[],
  notFounds: 0,
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    navigation.redirects.push(href);
    throw new Error("NEXT_REDIRECT");
  },
  notFound: () => {
    navigation.notFounds += 1;
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => {
  cleanup();
  sessionRole = "super_admin";
  navigation.redirects.length = 0;
  navigation.notFounds = 0;
});

describe("Bloc35 7.1, updated Bloc 50: EditToolPage's contextual back link for the shared Templars editor", () => {
  it("goes back to Référentiels when opened from the Référentiels reference table (?from=referentiels)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({ from: "referentiels" }),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });

  it("goes back to Tools when opened from the Tools table (no from param)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute("href", "/admin/tools");
  });

  it("falls back to Référentiels for a references_manager without calculators.read, even with no from param", async () => {
    sessionRole = "references_manager";
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });
});

describe("Bloc36/A, updated Bloc 50: EditToolPage's contextual back link for the shared Gems editor", () => {
  it("goes back to Référentiels when opened from the Référentiels reference table (?from=referentiels)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "gems" }),
        searchParams: Promise.resolve({ from: "referentiels" }),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });

  it("goes back to Tools when opened from the Tools table (no from param)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "gems" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute("href", "/admin/tools");
  });

  it("falls back to Référentiels for a references_manager without calculators.read, even with no from param", async () => {
    sessionRole = "references_manager";
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "gems" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });
});

/**
 * Bloc 137 — le Classement ne porte plus de capacité d'édition de ligue.
 *
 * Constat du porteur de projet : créer ou modifier une ligue restait possible
 * depuis l'outil Classement. Reproduit sur le code déployé (`main`, 15/09), pas
 * sur `dev` : le Bloc 135 avait bien retiré l'écran, mais neuf jours après
 * l'observation. Ce qu'aucun test ne tenait, en revanche, c'est l'absence
 * elle-même — rien ici ne tombait si une branche `id === "ranking"` revenait
 * monter un éditeur, et c'est cette classe de régression que les cas suivants
 * couvrent. Le déplacement lui-même est vérifié ailleurs (admin/tools/page,
 * admin/config/page) ; ici, c'est la porte d'entrée par l'URL.
 *
 * `toolParameterSource` est lu, pas recopié : la règle « un outil dont les
 * paramètres vivent dans Configuration n'a pas d'écran ici » vaut pour tout
 * slug qu'on y déplacera, pas seulement pour le Classement.
 */
describe("Bloc 137: no tool whose parameters live in Configuration keeps an edit screen", () => {
  // Le catalogue entier, pour que la règle vaille aussi pour un outil qu'on
  // déplacerait plus tard dans Configuration. Le slug et sa destination sont
  // relevés d'un seul passage : l'union `ToolParameterSource` ne porte `href`
  // que sur certaines de ses branches.
  const movedToConfiguration = calculatorCatalog.flatMap(({ slug }) => {
    const source = toolParameterSource(slug);
    return source.kind === "configuration" ? [{ slug, href: source.href }] : [];
  });
  const configurationSlugs = movedToConfiguration.map(({ slug }) => slug);

  it("covers the Classement, and every other slug moved to Configuration", () => {
    // Si ce cas tombe, c'est que le Classement n'est plus considéré comme géré
    // dans Configuration — donc que le Bloc 135 a été défait quelque part.
    expect(configurationSlugs).toContain("ranking");
  });

  it.each(movedToConfiguration)(
    "redirects /admin/tools/$slug to the section that carries its parameters",
    async ({ slug, href }) => {
      await expect(
        EditToolPage({
          params: Promise.resolve({ id: slug }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow("NEXT_REDIRECT");
      expect(navigation.redirects).toEqual([href]);
      // Une redirection, pas un 404 muet : l'ancienne adresse conduit à la
      // seule source de vérité au lieu d'une impasse.
      expect(navigation.notFounds).toBe(0);
    },
  );

  it("sends the Classement to the leagues and divisions section by name", async () => {
    await expect(
      EditToolPage({
        params: Promise.resolve({ id: "ranking" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(navigation.redirects).toEqual(["/admin/config#ligues-divisions"]);
  });

  it("renders no editor for the Classement, whatever the entry point", async () => {
    // Les paramètres que l'ancien écran portait dans l'URL (?entry=, ?from=)
    // ne doivent pas rouvrir un éditeur par une autre porte.
    for (const searchParams of [
      {},
      { from: "referentiels" },
      { entry: "bronze" },
    ]) {
      await expect(
        EditToolPage({
          params: Promise.resolve({ id: "ranking" }),
          searchParams: Promise.resolve(searchParams),
        }),
      ).rejects.toThrow("NEXT_REDIRECT");
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      cleanup();
      navigation.redirects.length = 0;
    }
  });

  it("still 404s a slug that never had an edit screen", async () => {
    // La redirection est réservée aux outils déplacés : elle ne doit pas
    // devenir un fourre-tout qui absorbe les adresses inexistantes.
    await expect(
      EditToolPage({
        params: Promise.resolve({ id: "city-rewards" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.redirects).toEqual([]);
    expect(navigation.notFounds).toBe(1);
  });
});
