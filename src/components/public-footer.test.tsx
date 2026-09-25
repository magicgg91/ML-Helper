import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicFooter } from "./public-footer";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

const columns = [
  {
    title: "Outils",
    links: [
      { href: "/tools/classement", label: "Classement" },
      { href: "/tools/villes", label: "Villes" },
    ],
  },
  {
    title: "Référentiels",
    links: [{ href: "/referentiels/shop", label: "Boutique" }],
  },
  {
    title: "Aide",
    links: [
      { href: "/contact?subject=data-error", label: "Signaler une erreur" },
    ],
  },
];

function renderFooter() {
  render(
    <PublicFooter
      brand="ML-Helper"
      lead="Outils, référentiels et guides de la communauté."
      note="Site communautaire non officiel, sans lien avec l'éditeur du jeu."
      columns={columns}
      copyright="© 2026 ML-Helper"
      legal={{ href: "/legal", label: "Mentions légales" }}
      navLabel="Pied de page"
    />,
  );
}

describe("Bloc 129 §2.2 : le pied de page sur quatre colonnes", () => {
  it("range ses liens sous des colonnes qui se nomment", () => {
    renderFooter();
    for (const column of columns) {
      const nav = screen.getByRole("navigation", { name: column.title });
      expect(within(nav).getAllByRole("link")).toHaveLength(
        column.links.length,
      );
    }
  });

  it("dit ce que fait le site, et qu'il n'est pas officiel", () => {
    renderFooter();
    expect(screen.getByText(/guides de la communauté/)).toBeInTheDocument();
    expect(
      screen.getByText(/sans lien avec l'éditeur du jeu/),
    ).toBeInTheDocument();
  });

  it("garde le copyright et les mentions légales sur la ligne du bas", () => {
    renderFooter();
    expect(screen.getByText("© 2026 ML-Helper")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mentions légales" }),
    ).toHaveAttribute("href", "/legal");
  });

  it("emmène « Signaler une erreur » sur Contact avec son objet", () => {
    renderFooter();
    expect(
      screen.getByRole("link", { name: "Signaler une erreur" }),
    ).toHaveAttribute("href", "/contact?subject=data-error");
  });
});
