import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Pill } from "./admin-pill";

afterEach(cleanup);

describe("Bloc 119: Pill", () => {
  it("carries the ink and background of its tone", () => {
    render(<Pill tone="warn">3 à compléter</Pill>);
    const pill = screen.getByText("3 à compléter");
    // The pair is what color-palette.test.ts measures for contrast; a chip
    // that took only one of the two would be unreadable in one theme.
    expect(pill).toHaveClass("bg-admin-warn");
    expect(pill).toHaveClass("text-admin-warn-ink");
  });

  it("is neutral when no tone is asked for", () => {
    render(<Pill>Brouillon</Pill>);
    expect(screen.getByText("Brouillon")).toHaveClass("bg-admin-neutral");
  });

  it("becomes a link when it points somewhere", () => {
    render(
      <Pill tone="accent" href="/admin/tools">
        Coût de Ville
      </Pill>,
    );
    const link = screen.getByRole("link", { name: "Coût de Ville" });
    expect(link).toHaveAttribute("href", "/admin/tools");
    // A link has to show its own focus ring; a plain chip has nothing to focus.
    expect(link).toHaveClass("admin-focus");
  });

  it("stays a plain span when it points nowhere", () => {
    render(<Pill tone="accent">Coût de Ville</Pill>);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
