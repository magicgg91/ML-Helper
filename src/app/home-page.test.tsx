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
    },
    {
      id: "g2",
      slug: "guide-2",
      title: { fr: "Guide 2" },
      excerpt: { fr: "Excerpt 2" },
      coverImage: null,
    },
    {
      id: "g3",
      slug: "guide-3",
      title: { fr: "Guide 3" },
      excerpt: { fr: "Excerpt 3" },
      coverImage: null,
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

  it("replaces the carousel/hero with a short intro sentence (Bloc 34/D)", async () => {
    render(await HomePage());
    expect(document.querySelector(".home-carousel")).toBeNull();
    expect(screen.getByText("intro")).toBeInTheDocument();
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
    // No detour via /guides — the section links directly to each guide,
    // not to a "browse all guides" page.
    expect(screen.queryByRole("link", { name: "guides" })).toBeNull();
  });

  it("fetches the 6 most recent published guides (Bloc 50 Group3: raised from 3)", async () => {
    render(await HomePage());
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 6 }),
    );
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
    // No detour via /referentiels — the section links directly to each
    // reference, not to a "browse all references" page.
    expect(
      within(referencesSection).queryByRole("link", { name: "referentiels" }),
    ).toBeNull();
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
