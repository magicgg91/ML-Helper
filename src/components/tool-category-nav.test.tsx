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
      ranking: "Classement",
      skills: "Compétences",
      references: "Référentiels",
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
          referentiels: true,
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
  });

  it("keeps unavailable categories visible but disabled", () => {
    render(
      <ToolCategoryNav
        availability={{
          villes: true,
          classement: false,
          competences: true,
          referentiels: true,
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Classement" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Classement" })).toBeNull();
  });
});
