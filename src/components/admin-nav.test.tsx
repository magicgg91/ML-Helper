import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

let pathname = "/admin";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
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
});
