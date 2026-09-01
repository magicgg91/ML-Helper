import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defaultCalculatorAvailability } from "../lib/calculator-catalog";
import { ToolCategoryGrid } from "./tool-category-grid";

const t = ((key: string, opts?: { count?: number }) =>
  key === "count"
    ? `${opts?.count ?? 0} outil(s)`
    : key) as unknown as Parameters<typeof ToolCategoryGrid>[0]["t"];

afterEach(cleanup);

describe("ToolCategoryGrid (Bloc 36/B)", () => {
  it("uses the real AI-generated illustration for each of the 4 categories, same source on every page it's used from", () => {
    render(<ToolCategoryGrid active={defaultCalculatorAvailability} t={t} />);
    for (const src of [
      "/tools/cities.webp",
      "/tools/fight.webp",
      "/tools/ranking.webp",
      "/tools/skills.webp",
    ])
      expect(document.querySelector(`img[src='${src}']`)).toBeInTheDocument();
  });

  it("falls back to the placeholder icon instead of a broken image once a category file fails to load", () => {
    render(<ToolCategoryGrid active={defaultCalculatorAvailability} t={t} />);
    const citiesImage = document.querySelector(
      "img[src='/tools/cities.webp']",
    )!;
    fireEvent.error(citiesImage);
    expect(
      document.querySelector("img[src='/tools/cities.webp']"),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector("img[src='/category-cities.svg']"),
    ).toBeInTheDocument();
  });

  it("loads only the first (Villes) tile eagerly, the rest lazily", () => {
    render(<ToolCategoryGrid active={defaultCalculatorAvailability} t={t} />);
    expect(
      document.querySelector("img[src='/tools/cities.webp']"),
    ).toHaveAttribute("loading", "eager");
    expect(
      document.querySelector("img[src='/tools/fight.webp']"),
    ).toHaveAttribute("loading", "lazy");
  });

  // Bloc 62/J: the colored-asterisk treatment (CSS: .tool-unavailable) is
  // present on every category with no active tool — checked here on 2
  // (Combat and Classement, both fully disabled in this fixture). Shared
  // markup used unchanged by both /tools and the homepage dashboard.
  it("Bloc62/J: carries the .tool-unavailable class on at least 2 disabled categories", () => {
    const { container } = render(
      <ToolCategoryGrid
        active={{
          ...defaultCalculatorAvailability,
          "xp-gain-rate": false,
          "demo-attack-troops": false,
          ranking: false,
        }}
        t={t}
      />,
    );
    const cards = Array.from(container.querySelectorAll(".public-card-disabled"));
    expect(cards).toHaveLength(2);
    for (const card of cards)
      expect(card.querySelector(".tool-unavailable")).not.toBeNull();
  });
});
