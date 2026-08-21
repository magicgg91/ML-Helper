import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "./(public)/layout";
import ToolsLayout from "./(public)/tools/layout";
import ToolDetailLayout from "./(public)/tools/[slug]/layout";
import { NextIntlClientProvider } from "next-intl";

vi.mock("../components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Thème</button>,
}));
vi.mock("../components/locale-switcher", () => ({
  LocaleSwitcher: () => <select aria-label="Language / Langue" />,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("../lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "city-cost": true,
    "city-max-level": true,
    "city-production": true,
    ranking: true,
    "stuff-simulator": true,
    "stuff-comparison": true,
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
      await PublicLayout({
        children: <p>Accueil</p>,
        params: Promise.resolve({}),
      }),
    );

    expect(screen.queryByText("Paramètres du joueur")).not.toBeInTheDocument();
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
      <NextIntlClientProvider
        locale="fr"
        messages={{
          Tools: {
            cities: "Villes",
            ranking: "Classement",
            skills: "Compétences",
          },
        }}
      >
        {await ToolDetailLayout({
          children: <p>Outils</p>,
          params: Promise.resolve({ slug: "villes" }),
        })}
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Paramètres du joueur")).toBeInTheDocument();
  });
});
