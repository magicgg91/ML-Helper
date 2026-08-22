import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ToolsPage from "./(public)/tools/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "city-cost": true,
    "city-max-level": true,
    "city-production": true,
    ranking: false,
    "stuff-simulator": true,
    "stuff-comparison": true,
    gems: true,
    templars: true,
    "xp-gain-rate": false,
    "demo-attack-troops": false,
    "combat-equipment": true,
    "expedition-equipment": true,
  }),
}));

afterEach(cleanup);

describe("ToolsPage", () => {
  it("makes the whole card a link for an available category", async () => {
    render(await ToolsPage());
    const link = screen.getByRole("link", { name: /cities.*open/ });
    expect(link).toHaveAttribute("href", "/tools/villes");
  });

  it("keeps an unavailable category as a non-interactive card", async () => {
    render(await ToolsPage());
    expect(
      screen.queryByRole("link", { name: /combat/ }),
    ).not.toBeInTheDocument();
    const disabledCard = screen.getByText("combat").closest("article")!;
    expect(disabledCard).toHaveAttribute("data-disabled");
  });
});
