import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

let pathname = "/admin";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      dashboard: "Tableau de bord",
      calculators: "Calculateurs",
      references: "Référentiels",
      guides: "Guides",
      content: "Contenu statique",
      users: "Utilisateurs",
      logs: "Logs",
    })[key],
}));
afterEach(cleanup);

describe("AdminNav", () => {
  it("marks the current section and exposes Super Admin links", () => {
    pathname = "/admin/references/combat";
    render(<AdminNav role="super_admin" />);
    expect(screen.getByRole("link", { name: "Référentiels" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Utilisateurs" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Logs" })).toBeVisible();
  });

  it("limits a guide manager to dashboard and guides", () => {
    pathname = "/admin/guides";
    render(<AdminNav role="guides_manager" />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("hides only user management from a regular admin", () => {
    pathname = "/admin";
    render(<AdminNav role="admin" />);
    expect(screen.queryByRole("link", { name: "Utilisateurs" })).toBeNull();
    for (const name of [
      "Calculateurs",
      "Référentiels",
      "Guides",
      "Contenu statique",
      "Logs",
    ])
      expect(screen.getByRole("link", { name })).toBeVisible();
  });

  it("limits a calculator manager to calculators and references", () => {
    pathname = "/admin/calculators";
    render(<AdminNav role="calculators_manager" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Calculateurs" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Référentiels" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Guides" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Logs" })).toBeNull();
  });
});
