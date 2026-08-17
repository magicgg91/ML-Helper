import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "./(public)/layout";
import ToolsLayout from "./(public)/tools/layout";

vi.mock("../components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Thème</button>,
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
  it("keeps player settings out of general public pages", () => {
    render(
      <PublicLayout params={Promise.resolve({})}>
        <p>Accueil</p>
      </PublicLayout>,
    );

    expect(screen.queryByText("Paramètres du joueur")).not.toBeInTheDocument();
  });

  it("shows player settings throughout the tools section", async () => {
    render(
      await ToolsLayout({
        children: <p>Outils</p>,
        params: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Paramètres du joueur")).toBeInTheDocument();
  });
});
