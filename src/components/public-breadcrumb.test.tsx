import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Breadcrumb } from "./public-breadcrumb";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

const items = [
  { label: "Accueil", href: "/" },
  { label: "Outils", href: "/tools" },
  { label: "Villes", href: "/tools/villes" },
  { label: "Coût de ville" },
];

describe("Bloc 129 §2.3 : le fil d'Ariane", () => {
  it("se nomme, pour qui navigue au clavier ou à l'oreille", () => {
    render(<Breadcrumb items={items} label="Fil d'Ariane" />);
    expect(
      screen.getByRole("navigation", { name: "Fil d'Ariane" }),
    ).toBeInTheDocument();
  });

  it("lie tout sauf la page courante", () => {
    render(<Breadcrumb items={items} label="Fil d'Ariane" />);
    const nav = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Accueil", "Outils", "Villes"]);
    // La page où l'on est déjà : présente, annoncée comme courante, mais pas
    // un lien — sans quoi on annoncerait un lien qui ne mène nulle part.
    const current = within(nav).getByText("Coût de ville");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).not.toBe("A");
  });

  it("ne fait pas annoncer ses séparateurs", () => {
    const { container } = render(
      <Breadcrumb items={items} label="Fil d'Ariane" />,
    );
    const separators = container.querySelectorAll(".breadcrumb-separator");
    // Trois séparateurs pour quatre éléments, et aucun devant le premier.
    expect(separators).toHaveLength(3);
    for (const separator of separators)
      expect(separator).toHaveAttribute("aria-hidden", "true");
  });
});
