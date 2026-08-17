import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolCategoryNav } from "./tool-category-nav";

let pathname = "/tools";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("ToolCategoryNav", () => {
  beforeEach(() => {
    pathname = "/tools";
  });

  it("marks only the current simulator category as active", () => {
    pathname = "/tools/competences";
    render(<ToolCategoryNav />);

    expect(screen.getByRole("link", { name: "Compétences" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Villes" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
