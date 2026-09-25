import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage, { generateMetadata } from "./[locale]/(public)/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "fr",
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("../services/setup-superadmin", () => ({
  hasSuperAdmin: async () => true,
}));
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "city-cost": true,
    "city-max-level": true,
    "city-production": true,
    "city-rewards": true,
    "xp-gain-rate": false,
    "demo-attack-troops": false,
    ranking: true,
    "stuff-simulator": true,
    "expedition-equipment-simulator": true,
    gems: true,
    templars: true,
    // Bloc 60 review (Codex PR #81): ReferenceCatalogGrid now filters by
    // availability too — these are the calculatorSlugs (not public slugs)
    // of the 7 references, all active so the section below keeps showing
    // every one of them, same as before this filter existed.
    "combat-equipment": true,
    "expedition-equipment": true,
    "level-up": true,
    templiers: true,
    gemmes: true,
    consommables: true,
    events: true,
  }),
}));
const { recentGuides, findManyMock } = vi.hoisted(() => {
  const recentGuides = [
    {
      id: "g1",
      slug: "guide-1",
      title: { fr: "Guide 1" },
      excerpt: { fr: "Excerpt 1" },
      coverImage: null,
      category: ["combat"],
      publishedAt: new Date("2026-03-01"),
    },
    {
      id: "g2",
      slug: "guide-2",
      title: { fr: "Guide 2" },
      // §1.4 : un résumé écrit en markdown doit s'afficher sans ses marques.
      excerpt: { fr: "Les bases de **Million Lords**." },
      coverImage: null,
      category: ["debuter"],
      publishedAt: new Date("2026-01-15"),
    },
    {
      id: "g3",
      slug: "guide-3",
      title: { fr: "Guide 3" },
      excerpt: { fr: "Excerpt 3" },
      coverImage: null,
      category: ["clan"],
      publishedAt: new Date("2026-02-01"),
    },
  ];
  return {
    recentGuides,
    findManyMock: vi.fn(() => Promise.resolve(recentGuides)),
  };
});
vi.mock("@/lib/prisma", () => ({
  prisma: { guide: { findMany: findManyMock } },
}));

afterEach(cleanup);

// Bloc 42/J: every public page's metadata must carry a real (never empty)
// description, plus hreflang alternates for the 5 launched locales — this
// app's routing is cookie-based (no locale segment in the URL), so every
// alternate self-references the same canonical URL.
describe("HomePage metadata (Bloc 42/J)", () => {
  it("sets a non-empty description and hreflang alternates for all 5 locales", async () => {
    const metadata = await generateMetadata();
    expect(metadata.description).toBeTruthy();
    const languages = metadata.alternates?.languages as
      Record<string, string> | undefined;
    expect(languages?.fr).toBe("https://ml-helper.com/fr");
    expect(languages?.["x-default"]).toBe("https://ml-helper.com/fr");
    // Bloc 91/E1: canonical resolves to the active locale's prefixed URL.
    expect(metadata.alternates?.canonical).toBe("https://ml-helper.com/fr");
  });
});

describe("HomePage", () => {
  it("gives 1-click access to a tool category directly on the homepage (Bloc 33/A)", async () => {
    render(await HomePage());
    const link = screen.getByRole("link", { name: /cities/ });
    expect(link).toHaveAttribute("href", "/tools/villes");
  });

  it("keeps an unavailable category non-interactive on the homepage too", async () => {
    const { container } = render(await HomePage());
    const toolsSection = container.querySelector<HTMLElement>(".home-tools")!;
    expect(
      within(toolsSection).queryByRole("link", { name: /combat/ }),
    ).toBeNull();
  });

  // Bloc 129 §3.1 : le hero revient, mais ce n'est pas le carrousel que le
  // Bloc 34/D avait retiré — c'est un bloc statique de texte et de liens.
  it("ouvre sur un hero de texte, jamais sur un carrousel", async () => {
    render(await HomePage());
    expect(document.querySelector(".home-carousel")).toBeNull();
    expect(document.querySelector(".home-hero")).toBeInTheDocument();
    expect(screen.getByText("intro")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("h1");
  });

  // Bloc 50 Group3: the combined guides/référentiels section split into 2
  // independent sections — each still links directly to its guides/
  // references (no detour via /guides or /referentiels).
  it("shows the most recent guides, each directly clickable, in their own section (Bloc 34/E)", async () => {
    render(await HomePage());
    for (const guide of recentGuides) {
      const link = screen.getByRole("link", {
        name: new RegExp(guide.title.fr),
      });
      expect(link).toHaveAttribute("href", `/guides/${guide.slug}`);
    }
    // Bloc 129 §3.1 : la section porte désormais un lien « Tous les guides »
    // à droite de son titre — le §3.1 le demande explicitement. Ce que ce
    // test protégeait tient toujours : chaque guide reste joignable en un
    // clic depuis l'accueil, sans passer par /guides.
  });

  // Bloc 129 §3.1 : la page ne prend plus « les six derniers ». Elle lit
  // tous les guides publiés, parce qu'elle en a besoin pour deux choses que
  // la page d'avant ne faisait pas — compter les guides dans le hero, et
  // désigner celui de la carte « Commence ici » — puis n'en affiche que
  // cinq à côté de cette carte.
  it("lit tous les guides publiés, et n'en liste que cinq à côté de la carte", async () => {
    render(await HomePage());
    expect(findManyMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ take: expect.anything() }),
    );
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "published" } }),
    );
  });

  it("compte les outils, les référentiels et les guides réellement accessibles", async () => {
    render(await HomePage());
    // 9 outils actifs sur 11 (xp-gain-rate et demo-attack-troops sont
    // désactivés dans le mock), 7 référentiels, 3 guides.
    expect(screen.getByText("count-tools")).toBeInTheDocument();
    expect(screen.getByText("count-references")).toBeInTheDocument();
    expect(screen.getByText("count-guides")).toBeInTheDocument();
  });

  it("met « Commence ici » sur le guide de la catégorie configurée", async () => {
    const { container } = render(await HomePage());
    const card = container.querySelector<HTMLAnchorElement>(".start-here-card");
    // guide-2 est le seul de la catégorie « debuter ».
    expect(card).toHaveAttribute("href", "/guides/guide-2");
    // §1.4 : et son résumé s'affiche sans ses astérisques.
    expect(
      within(card!).getByText("Les bases de Million Lords."),
    ).toBeInTheDocument();
    // Le guide mis en avant ne se répète pas dans la liste à côté.
    const list = container.querySelector<HTMLElement>(".home-guide-list")!;
    expect(within(list).queryByRole("link", { name: /Guide 2/ })).toBeNull();
  });

  it("propose le panneau « Les plus utilisés » et le bandeau de signalement", async () => {
    const { container } = render(await HomePage());
    const panel = container.querySelector<HTMLElement>(".home-hero-panel")!;
    expect(panel).not.toBeNull();
    // Les trois outils de Villes de la configuration, plus deux référentiels.
    expect(within(panel).getAllByRole("link")).toHaveLength(5);
    expect(
      within(panel).getByRole("link", { name: /city-cost.name/ }),
    ).toHaveAttribute("href", "/tools/villes?open=cost");
    const banner = container.querySelector<HTMLElement>(".report-banner")!;
    expect(
      within(banner).getByRole("link", { name: "report-error" }),
    ).toHaveAttribute("href", "/contact?subject=data-error");
  });

  it("shows the built references, each directly clickable, in their own section", async () => {
    const { container } = render(await HomePage());
    const referencesSection =
      container.querySelector<HTMLElement>(".home-references")!;
    expect(referencesSection).not.toBeNull();
    for (const slug of [
      "combat-equipment",
      "expedition-equipment",
      "level-up",
      "templars",
    ]) {
      const link = within(referencesSection).getByRole("link", {
        name: new RegExp(`catalog.${slug}`),
      });
      expect(link).toHaveAttribute("href", `/referentiels/${slug}`);
    }
    // Même remarque que pour les guides : la section porte maintenant son
    // lien « Tous les référentiels » (§3.1), et chaque référentiel reste
    // joignable directement.
  });

  it("Bloc36/B: shows the real category illustration for every tile on the homepage too", async () => {
    render(await HomePage());
    for (const src of [
      "/tools/cities.webp",
      "/tools/fight.webp",
      "/tools/ranking.webp",
      "/tools/skills.webp",
    ])
      expect(document.querySelector(`img[src='${src}']`)).toBeInTheDocument();
  });

  it("orders the 3 sections Outils, then Références, then Guides", async () => {
    const { container } = render(await HomePage());
    const main = container.querySelector("main")!;
    const sections = Array.from(main.querySelectorAll(":scope > section"));
    const toolsIndex = sections.findIndex((section) =>
      section.classList.contains("home-tools"),
    );
    const referencesIndex = sections.findIndex((section) =>
      section.classList.contains("home-references"),
    );
    const guidesIndex = sections.findIndex((section) =>
      section.classList.contains("home-guides"),
    );
    expect(toolsIndex).toBeGreaterThanOrEqual(0);
    expect(referencesIndex).toBeGreaterThan(toolsIndex);
    expect(guidesIndex).toBeGreaterThan(referencesIndex);
  });
});
