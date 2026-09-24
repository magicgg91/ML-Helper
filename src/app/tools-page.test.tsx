import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ToolsPage, { generateMetadata } from "./[locale]/(public)/tools/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "fr",
}));
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "city-cost": true,
    "city-max-level": true,
    "city-production": true,
    ranking: false,
    "stuff-simulator": true,
    "expedition-equipment-simulator": true,
    gems: true,
    templars: true,
    "xp-gain-rate": false,
    "demo-attack-troops": false,
    "combat-equipment": true,
    "expedition-equipment": true,
  }),
}));

afterEach(cleanup);

// Bloc 42/J: same requirement as every other public page — real
// description, hreflang alternates for the 5 launched locales.
describe("ToolsPage metadata (Bloc 42/J)", () => {
  it("sets a non-empty description and hreflang alternates for all 5 locales", async () => {
    const metadata = await generateMetadata();
    expect(metadata.description).toBeTruthy();
    const languages = metadata.alternates?.languages as
      Record<string, string> | undefined;
    expect(languages?.fr).toBe("https://ml-helper.com/fr/tools");
    expect(languages?.["x-default"]).toBe("https://ml-helper.com/fr/tools");
    // Bloc 91/E1: canonical resolves to the active locale's prefixed URL.
    expect(metadata.alternates?.canonical).toBe(
      "https://ml-helper.com/fr/tools",
    );
  });
});

describe("ToolsPage", () => {
  it("makes the whole card a link for an available category", async () => {
    render(await ToolsPage());
    const link = screen.getByRole("link", { name: /cities/ });
    expect(link).toHaveAttribute("href", "/tools/villes");
  });

  it("drops the redundant 'open category' text — the whole tile is already clickable (Bloc 33/E)", async () => {
    render(await ToolsPage());
    expect(screen.queryByText("open")).not.toBeInTheDocument();
  });

  // Bloc 129 §3.2 : le titre passe dans l'en-tête de page commun (§2), donc
  // il perd la classe .tools-page-title qui existait pour rétrécir une
  // phrase longue sur une ligne (Bloc 33/F). Ce que ce test protège reste
  // le même : un seul H1, et pas de surtitre au-dessus.
  it("Bloc129/§3.2: un seul H1 dans l'en-tête de page, sans surtitre", async () => {
    render(await ToolsPage());
    expect(screen.queryByText("eyebrow")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1 }).closest(".page-header"),
    ).not.toBeNull();
  });

  it("keeps an unavailable category as a non-interactive card", async () => {
    render(await ToolsPage());
    expect(
      screen.queryByRole("link", { name: /combat/ }),
    ).not.toBeInTheDocument();
    const disabledCard = screen.getByText("combat").closest("article")!;
    expect(disabledCard).toHaveAttribute("data-disabled");
  });

  // Bloc 129 §3.2 : la page porte son propre titre et sa propre
  // introduction. Le Bloc 38/K lui faisait reprendre celle de la section
  // Outils de l'accueil ; ce qui compte ici n'a pas changé — une phrase
  // d'introduction, juste sous le titre — mais c'est la sienne.
  it("Bloc129/§3.2: porte sa propre introduction, juste sous le titre", async () => {
    render(await ToolsPage());
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("index-title");
    expect(heading.nextElementSibling?.tagName).toBe("P");
    expect(heading.nextElementSibling).toHaveTextContent("index-intro");
  });

  it("Bloc36/B: shows the real category illustration for every tile, on /tools too", async () => {
    render(await ToolsPage());
    for (const src of [
      "/tools/cities.webp",
      "/tools/fight.webp",
      "/tools/ranking.webp",
      "/tools/skills.webp",
    ])
      expect(document.querySelector(`img[src='${src}']`)).toBeInTheDocument();
  });
});
