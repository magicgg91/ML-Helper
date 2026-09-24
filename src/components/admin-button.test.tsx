import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminButton } from "./admin-button";

afterEach(cleanup);

describe("Bloc 119: AdminButton", () => {
  it("is 40 px tall by default and 34 in small", () => {
    // The two heights of §1. They are read from the tokens rather than
    // written as numbers, so a change of scale stays a change of one line.
    render(
      <>
        <AdminButton>Enregistrer</AdminButton>
        <AdminButton size="sm">Modifier</AdminButton>
      </>,
    );
    expect(screen.getByText("Enregistrer")).toHaveClass(
      "h-[var(--admin-control-h)]",
    );
    expect(screen.getByText("Modifier")).toHaveClass(
      "h-[var(--admin-control-h-sm)]",
    );
  });

  it("paints the primary action with the accent", () => {
    render(<AdminButton variant="primary">Enregistrer</AdminButton>);
    const button = screen.getByText("Enregistrer");
    expect(button).toHaveClass("bg-admin-accent");
    expect(button).toHaveClass("text-admin-on-accent");
  });

  it("gives a destructive action the danger ink, never a filled red", () => {
    render(<AdminButton variant="danger">Supprimer</AdminButton>);
    expect(screen.getByText("Supprimer")).toHaveClass("text-admin-danger-ink");
  });

  it("lends its styling to a link with asChild", () => {
    // A "Voir sur le site" action is a navigation: it has to be an anchor,
    // middle-clickable and openable in a new tab, not a button that looks
    // like one.
    render(
      <AdminButton asChild>
        {/* An absolute URL: this action opens the public site, which in
            production is a different origin from the admin. */}
        <a href="https://ml-helper.fr/guides">Voir sur le site</a>
      </AdminButton>,
    );
    const link = screen.getByRole("link", { name: "Voir sur le site" });
    expect(link).toHaveClass("admin-focus");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
