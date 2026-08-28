import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./(public)/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
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
  }),
}));

afterEach(cleanup);

describe("HomePage", () => {
  it("gives 1-click access to a tool category directly on the homepage (Bloc 33/A)", async () => {
    render(await HomePage());
    const link = screen.getByRole("link", { name: /cities/ });
    expect(link).toHaveAttribute("href", "/tools/villes");
  });

  it("keeps an unavailable category non-interactive on the homepage too", async () => {
    render(await HomePage());
    expect(screen.queryByRole("link", { name: /combat/ })).toBeNull();
  });

  it("shows a small Guides/Référentiels section below the tools, linking to /guides", async () => {
    render(await HomePage());
    const guidesLink = screen.getByRole("link", { name: "guides" });
    expect(guidesLink).toHaveAttribute("href", "/guides");
    // Small teaser, not the full guides hub — no guide-hub filter controls
    // rendered on the homepage.
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("keeps the tools section above the guides teaser", async () => {
    const { container } = render(await HomePage());
    const main = container.querySelector("main")!;
    const sections = Array.from(main.querySelectorAll(":scope > section"));
    const toolsIndex = sections.findIndex((section) =>
      section.classList.contains("home-tools"),
    );
    const guidesIndex = sections.findIndex((section) =>
      section.classList.contains("home-guides-teaser"),
    );
    expect(toolsIndex).toBeGreaterThanOrEqual(0);
    expect(guidesIndex).toBeGreaterThan(toolsIndex);
  });
});
