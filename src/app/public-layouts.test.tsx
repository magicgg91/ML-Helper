import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "./(public)/layout";
import ToolsLayout from "./(public)/tools/layout";
import ToolDetailLayout from "./(public)/tools/[slug]/layout";
import ReferentielsLayout from "./(public)/referentiels/layout";
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

  // Bloc 50/E: the reference-switcher banner is promoted from a
  // per-detail-page inline element into the section-level header nav of the
  // whole /referentiels route — this single layout wraps both the index and
  // every detail page.
  it("renders the reference switcher nav above the section's children", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        {await ReferentielsLayout({
          children: <p>Référentiels</p>,
          params: Promise.resolve({}),
        })}
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Référentiels" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Référentiels")).toBeInTheDocument();
  });
});
