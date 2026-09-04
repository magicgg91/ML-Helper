import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "./(public)/layout";
import ToolsLayout from "./(public)/tools/layout";
import ToolDetailLayout from "./(public)/tools/[slug]/layout";
import ReferentielsLayout from "./(public)/referentiels/layout";
import ReferentielDetailLayout from "./(public)/referentiels/[slug]/layout";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";

vi.mock("../components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Thème</button>,
}));
vi.mock("../components/locale-toggle", () => ({
  LocaleToggle: () => <div role="group">FR EN</div>,
}));
vi.mock("../i18n/config", () => ({
  getAvailableLocales: async () => ["en", "fr"],
}));
// Bloc 90: the public layout now sources the selector's locales from the DB
// (getActiveLocales) rather than the filesystem — stub it here.
vi.mock("@/lib/locale-settings", () => ({
  getActiveLocales: async () => ["en", "fr"],
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "fr",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { guide: { findMany: vi.fn().mockResolvedValue([]) } },
}));
vi.mock("../lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "city-cost": true,
    "city-max-level": true,
    "city-production": true,
    ranking: true,
    "stuff-simulator": true,
    "expedition-equipment-simulator": true,
    gems: true,
    templars: true,
    "combat-equipment": true,
    "expedition-equipment": true,
    // Bloc 62/I: the reference-switcher nav now renders every reference
    // (inactive ones as a non-clickable teaser instead of just filtering
    // them out) — these are the references' own calculatorSlugs, distinct
    // from the tool slugs above (gems/templars) for Gemmes/Templiers.
    "level-up": true,
    gemmes: true,
    templiers: true,
    consommables: true,
    events: true,
  }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

afterEach(cleanup);

describe("public layouts", () => {
  it("keeps player settings out of general public pages", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        {await PublicLayout({
          children: <p>Accueil</p>,
          params: Promise.resolve({}),
        })}
      </NextIntlClientProvider>,
    );

    expect(screen.queryByText("Paramètres du joueur")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "admin" })).toBeNull();
  });

  it("exposes the main sections as real links in the header nav", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        {await PublicLayout({
          children: <p>Accueil</p>,
          params: Promise.resolve({}),
        })}
      </NextIntlClientProvider>,
    );

    const nav = screen.getByRole("navigation", {
      name: "Navigation principale",
    });
    expect(within(nav).getByRole("link", { name: "tools" })).toHaveAttribute(
      "href",
      "/tools",
    );
    expect(
      within(nav).getByRole("link", { name: "referentiels" }),
    ).toHaveAttribute("href", "/referentiels");
    expect(within(nav).getByRole("link", { name: "guides" })).toHaveAttribute(
      "href",
      "/guides",
    );
    expect(within(nav).getByRole("link", { name: "contact" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("keeps the tools landing page limited to its category content", () => {
    render(
      <ToolsLayout params={Promise.resolve({})}>
        <p>Catégories</p>
      </ToolsLayout>,
    );

    expect(screen.getByText("Catégories")).toBeInTheDocument();
    expect(screen.queryByText("Paramètres du joueur")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Catégories de simulateurs" }),
    ).not.toBeInTheDocument();
  });

  it("shows player settings after a tool category is selected", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        {await ToolDetailLayout({
          children: <p>Outils</p>,
          params: Promise.resolve({ slug: "villes" }),
        })}
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Paramètres du joueur")).toBeInTheDocument();
  });

  // Bloc 52/B: the switcher nav moved out of this top-level layout (which
  // wraps the index page too) into [slug]/layout.tsx below — the index
  // already shows every reference as an illustrated tile, so repeating
  // them as a text nav there was redundant.
  it("Bloc52/B: the /referentiels index layout is a bare passthrough, no switcher nav", () => {
    render(
      <ReferentielsLayout params={Promise.resolve({})}>
        <p>Référentiels</p>
      </ReferentielsLayout>,
    );

    expect(screen.getByText("Référentiels")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Référentiels" }),
    ).not.toBeInTheDocument();
  });

  // Bloc 50/E, moved in Bloc 52/B: the reference-switcher banner is the
  // header nav of a specific reference's page, not the /referentiels
  // index — scoped to the [slug] segment only, same pattern as
  // tools/[slug]/layout.tsx.
  it("Bloc52/B: the [slug] detail layout renders the reference switcher nav above its children", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        {await ReferentielDetailLayout({
          // Bloc 62/I: an arbitrary placeholder distinct from every real
          // reference name — the switcher nav now always renders all 7 of
          // those (Boutique included), so reusing "Boutique" here made
          // this assertion ambiguous between the page's own content and
          // the nav's own "Boutique" link.
          children: <p>Contenu de la page</p>,
          params: Promise.resolve({ slug: "shop" }),
        })}
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Référentiels" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Contenu de la page")).toBeInTheDocument();
  });
});
