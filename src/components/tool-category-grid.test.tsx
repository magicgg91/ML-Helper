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
    render(
      <ToolCategoryGrid
        locale="fr"
        active={defaultCalculatorAvailability}
        t={t}
      />,
    );
    for (const src of [
      "/tools/cities.webp",
      "/tools/fight.webp",
      "/tools/ranking.webp",
      "/tools/skills.webp",
    ])
      expect(document.querySelector(`img[src='${src}']`)).toBeInTheDocument();
  });

  it("falls back to the placeholder icon instead of a broken image once a category file fails to load", () => {
    render(
      <ToolCategoryGrid
        locale="fr"
        active={defaultCalculatorAvailability}
        t={t}
      />,
    );
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

  // Bloc 64/A review: eager-loading follows the rendered position, not a
  // named category — with the fixture's pass-through translator the order
  // is cities/combat/ranking/skills, so cities is still first here.
  it("loads only the first tile eagerly, the rest lazily", () => {
    render(
      <ToolCategoryGrid
        locale="fr"
        active={defaultCalculatorAvailability}
        t={t}
      />,
    );
    expect(
      document.querySelector("img[src='/tools/cities.webp']"),
    ).toHaveAttribute("loading", "eager");
    expect(
      document.querySelector("img[src='/tools/fight.webp']"),
    ).toHaveAttribute("loading", "lazy");
  });

  // Bloc 64/A review: once the labels reorder the tiles, the LCP image is
  // whichever one now comes first — Classement in French, not Villes.
  it("Bloc64/A: eager-loads whichever tile the sort puts first, not a fixed category", () => {
    const labels: Record<string, string> = {
      cities: "Villes",
      combat: "Combat",
      ranking: "Classement",
      skills: "Compétences",
    };
    const translate = ((key: string, opts?: { count?: number }) =>
      key === "count"
        ? `${opts?.count ?? 0} outil(s)`
        : (labels[key] ?? key)) as unknown as Parameters<
      typeof ToolCategoryGrid
    >[0]["t"];
    render(
      <ToolCategoryGrid
        locale="fr"
        active={defaultCalculatorAvailability}
        t={translate}
      />,
    );
    const images = Array.from(document.querySelectorAll("img"));
    expect(images[0]).toHaveAttribute("src", "/tools/ranking.webp");
    expect(images[0]).toHaveAttribute("loading", "eager");
    for (const image of images.slice(1))
      expect(image).toHaveAttribute("loading", "lazy");
  });

  // Bloc 64/A: tiles ordered by the label the visitor reads, not by the
  // catalog's declaration order (Villes, Combat, Classement, Compétences)
  // — the fixture's translator returns the real French labels, so the two
  // orders genuinely differ.
  it("Bloc64/A: orders the tiles alphabetically by their displayed label", () => {
    const labels: Record<string, string> = {
      cities: "Villes",
      combat: "Combat",
      ranking: "Classement",
      skills: "Compétences",
    };
    const translate = ((key: string, opts?: { count?: number }) =>
      key === "count"
        ? `${opts?.count ?? 0} outil(s)`
        : (labels[key] ?? key)) as unknown as Parameters<
      typeof ToolCategoryGrid
    >[0]["t"];
    const { container } = render(
      <ToolCategoryGrid
        locale="fr"
        active={defaultCalculatorAvailability}
        t={translate}
      />,
    );
    const titles = Array.from(container.querySelectorAll("h2")).map(
      (heading) => heading.textContent,
    );
    expect(titles).toEqual(["Classement", "Combat", "Compétences", "Villes"]);
  });

  // Bloc 62/J: the colored-asterisk treatment (CSS: .tool-unavailable) is
  // present on every category with no active tool — checked here on 2
  // (Combat and Classement, both fully disabled in this fixture). Shared
  // markup used unchanged by both /tools and the homepage dashboard.
  it("Bloc62/J: carries the .tool-unavailable class on at least 2 disabled categories", () => {
    const { container } = render(
      <ToolCategoryGrid
        locale="fr"
        active={{
          ...defaultCalculatorAvailability,
          "xp-gain-rate": false,
          "demo-attack-troops": false,
          ranking: false,
        }}
        t={t}
      />,
    );
    const cards = Array.from(
      container.querySelectorAll(".public-card-disabled"),
    );
    expect(cards).toHaveLength(2);
    for (const card of cards)
      expect(card.querySelector(".tool-unavailable")).not.toBeNull();
  });
});
