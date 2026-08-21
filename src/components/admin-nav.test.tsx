import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

let pathname = "/admin";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      "navigation-label": "Navigation administration",
      "navigation.dashboard": "Tableau de bord",
      "navigation.tools": "Outils",
      "navigation.guides": "Guides",
      "navigation.content": "Contenu statique",
      "navigation.users": "Utilisateurs",
      "navigation.logs": "Historique",
    })[key],
}));
afterEach(cleanup);

describe("AdminNav", () => {
  it("marks the current section and exposes Super Admin links", () => {
    pathname = "/admin/guides/reference-combat-equipment";
    render(<AdminNav role="super_admin" />);
    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Utilisateurs" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Historique" })).toBeVisible();
  });

  it("co-locates references under Guides for guide managers", () => {
    pathname = "/admin/guides";
    render(<AdminNav role="guides_manager" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(links.map((link) => link.textContent)).toEqual([
      "Tableau de bord",
      "Guides",
    ]);
  });

  it("hides user management and legal content from a regular admin", () => {
    pathname = "/admin";
    render(<AdminNav role="admin" />);
    expect(screen.getByRole("link", { name: "Utilisateurs" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Contenu statique" })).toBeNull();
    for (const name of ["Outils", "Guides", "Historique"])
      expect(screen.getByRole("link", { name })).toBeVisible();
  });

  it("limits a tools manager to simulator administration", () => {
    pathname = "/admin/tools";
    render(<AdminNav role="tools_manager" />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Outils" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Référentiels" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Guides" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Historique" })).toBeNull();
  });

  it("gives read-only users consultation links without legal content", () => {
    pathname = "/admin";
    render(<AdminNav role="read_only" />);
    for (const name of [
      "Tableau de bord",
      "Outils",
      "Guides",
      "Utilisateurs",
      "Historique",
    ])
      expect(screen.getByRole("link", { name })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Contenu statique" })).toBeNull();
  });
});
