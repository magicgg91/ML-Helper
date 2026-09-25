import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SelectionBanner, SelectionTab } from "./selection-banner";

vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: unknown;
      children?: unknown;
      [key: string]: unknown;
    }) =>
      createElement(
        "a",
        { href: typeof href === "string" ? href : "#", ...props },
        children as never,
      ),
  };
});

afterEach(cleanup);

/**
 * Bloc 132 §8 : le bandeau partagé par les catégories d'outils et les
 * référentiels.
 *
 * Ce que ce fichier tient, c'est la frontière : le composant impose la
 * forme (le cadre, la bande, l'onglet, le nombre de colonnes) et laisse à
 * l'appelant la nature d'une entrée non cliquable, parce que les deux
 * bandeaux n'y mettent pas la même chose.
 */
describe("SelectionBanner", () => {
  it("nomme la navigation et annonce ses colonnes à la feuille de style", () => {
    render(
      <SelectionBanner navLabel="Catégories d’outils" columns={4}>
        <span />
      </SelectionBanner>,
    );
    const nav = screen.getByRole("navigation", { name: "Catégories d’outils" });
    expect(nav).toHaveClass("selection-banner-band");
    expect(nav.style.getPropertyValue("--selection-columns")).toBe("4");
  });

  it("porte le même cadre quel que soit le nombre de colonnes", () => {
    const { container } = render(
      <SelectionBanner navLabel="Référentiels" columns={7}>
        <span />
      </SelectionBanner>,
    );
    expect(container.firstChild).toHaveClass("selection-banner");
    expect(
      screen
        .getByRole("navigation")
        .style.getPropertyValue("--selection-columns"),
    ).toBe("7");
  });
});

describe("SelectionTab", () => {
  const base = { image: "/tools/cities.webp", label: "Villes" };

  it("rend un lien, et marque la page ouverte", () => {
    render(
      <>
        <SelectionTab {...base} href="/tools/villes" current />
        <SelectionTab {...base} label="Combat" href="/tools/combat" />
      </>,
    );
    const current = screen.getByRole("link", { name: "Villes" });
    expect(current).toHaveClass("selection-tab");
    expect(current).toHaveAttribute("href", "/tools/villes");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Combat" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  /**
   * Côté Outils, une catégorie sans outil actif garde une page : son onglet
   * est un bouton désactivé, et il reste le seul repère visible disant
   * qu'on y est — d'où `aria-current` sur un élément désactivé.
   */
  it("rend un bouton désactivé qui peut rester la page courante", () => {
    render(
      <SelectionTab
        {...base}
        element="button"
        title="Indisponible actuellement"
        badge="Indisponible actuellement"
        current
      />,
    );
    const button = screen.getByRole("button", { name: /^Villes/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-current", "page");
    expect(button).toHaveAttribute("title", "Indisponible actuellement");
  });

  /**
   * Côté Référentiels, une entrée pas encore ouverte n'a pas de page du
   * tout : ni lien, ni bouton — une case inerte qui garde sa place.
   */
  it("rend une case inerte pour une entrée sans page", () => {
    const { container } = render(
      <SelectionTab
        {...base}
        label="Événements"
        element="span"
        title="Indisponible actuellement"
        badge="Bientôt disponible"
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    const tab = container.querySelector('[aria-disabled="true"]');
    expect(tab).toHaveClass("selection-tab");
    expect(
      within(tab as HTMLElement).getByText(/Bientôt disponible/),
    ).toHaveClass(
      // Bloc 62/J : la mention est toujours affichée, pas seulement au
      // survol — sur tactile, une infobulle ne s'affiche jamais.
      "tab-coming-soon",
    );
  });

  it("place l'illustration en décoration, jamais dans le nom de l'onglet", () => {
    render(<SelectionTab {...base} href="/tools/villes" />);
    const image = screen.getByRole("link").querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(screen.getByRole("link").textContent).toBe("Villes");
  });

  it("affiche le nombre d'outils que l'appelant lui passe", () => {
    render(
      <SelectionTab {...base} href="/tools/villes">
        <span className="selection-tab-count">4</span>
      </SelectionTab>,
    );
    expect(
      screen.getByRole("link").querySelector(".selection-tab-count"),
    ).toHaveTextContent("4");
  });
});
