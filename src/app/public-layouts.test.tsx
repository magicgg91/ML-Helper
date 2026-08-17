import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "./(public)/layout";
import ToolsLayout from "./(public)/tools/layout";

vi.mock("../components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Thème</button>,
}));

afterEach(cleanup);

describe("public layouts", () => {
  it("keeps player settings out of general public pages", () => {
    render(
      <PublicLayout params={Promise.resolve({})}>
        <p>Accueil</p>
      </PublicLayout>,
    );

    expect(screen.queryByText("Paramètres du joueur")).not.toBeInTheDocument();
  });

  it("shows player settings throughout the tools section", () => {
    render(
      <ToolsLayout params={Promise.resolve({})}>
        <p>Outils</p>
      </ToolsLayout>,
    );

    expect(screen.getByText("Paramètres du joueur")).toBeInTheDocument();
  });
});
