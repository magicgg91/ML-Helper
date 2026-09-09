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

  it("removes the page title and shows only the one-line subtitle (Bloc 33/F)", async () => {
    render(await ToolsPage());
    expect(screen.queryByText("eyebrow")).not.toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("title");
    expect(heading).toHaveClass("tools-page-title");
  });

  it("keeps an unavailable category as a non-interactive card", async () => {
    render(await ToolsPage());
    expect(
      screen.queryByRole("link", { name: /combat/ }),
    ).not.toBeInTheDocument();
    const disabledCard = screen.getByText("combat").closest("article")!;
    expect(disabledCard).toHaveAttribute("data-disabled");
  });

  it("Bloc38/K: shows the same intro sentence as the homepage's tools section, right under the title", async () => {
    render(await ToolsPage());
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.nextElementSibling?.tagName).toBe("P");
    expect(heading.nextElementSibling).toHaveTextContent("subtitle");
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
