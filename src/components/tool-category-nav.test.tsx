import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolCategoryNav } from "./tool-category-nav";

let pathname = "/tools";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      cities: "Villes",
      combat: "Combat",
      ranking: "Classement",
      skills: "Compétences",
      "navigation-label": "Catégories d’outils",
      unavailable: "Indisponible actuellement",
    })[key],
}));

describe("ToolCategoryNav", () => {
  afterEach(cleanup);
  beforeEach(() => {
    pathname = "/tools";
  });

  it("marks only the current simulator category as active", () => {
    pathname = "/tools/competences";
    render(
      <ToolCategoryNav
        availability={{
          villes: true,
          classement: true,
          competences: true,
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Compétences" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Villes" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.queryByText("Référentiels")).toBeNull();
  });

  it("keeps unavailable categories visible but disabled", () => {
    render(
      <ToolCategoryNav
        availability={{
          villes: true,
          classement: false,
          competences: true,
        }}
      />,
    );
    const button = screen.getByRole("button", { name: /^Classement/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Indisponible actuellement");
    expect(screen.queryByRole("link", { name: "Classement" })).toBeNull();
  });

  it("shows the unavailable text permanently, not only on hover (Bloc 33/N)", () => {
    render(
      <ToolCategoryNav
        availability={{ villes: true, classement: false, competences: true }}
      />,
    );
    const button = screen.getByRole("button", { name: /^Classement/ });
    expect(button.querySelector(".tab-coming-soon")).toHaveTextContent(
      "Indisponible actuellement",
    );
  });

  // Bloc 62/J: the colored-asterisk treatment (CSS: .tab-coming-soon) is
  // present on every disabled tab, not just one — checked here on 2 (Combat
  // is disabled too, its slug missing from the fixture below).
  it("Bloc62/J: carries the .tab-coming-soon class on at least 2 disabled tabs", () => {
    render(
      <ToolCategoryNav
        availability={{ villes: true, classement: false, competences: true }}
      />,
    );
    const combatButton = screen.getByRole("button", { name: /^Combat/ });
    const classementButton = screen.getByRole("button", { name: /^Classement/ });
    expect(combatButton.querySelector(".tab-coming-soon")).not.toBeNull();
    expect(classementButton.querySelector(".tab-coming-soon")).not.toBeNull();
  });
});
