import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/fr.json";
import { PublicHeader } from "./public-header";
import { defaultCalculatorAvailability } from "@/lib/calculator-catalog";
import type { SiteSearchGuide } from "@/lib/site-search";

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
    usePathname: () => "/tools",
    useRouter: () => ({ replace: () => {} }),
  };
});

afterEach(cleanup);

const links = [
  { href: "/tools", label: "Outils" },
  { href: "/referentiels", label: "Référentiels" },
  { href: "/guides", label: "Guides" },
  { href: "/contact", label: "Contact" },
];

function renderHeader(guides: SiteSearchGuide[] = []) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <PublicHeader
        brand="ML-Helper"
        guides={guides}
        active={defaultCalculatorAvailability}
        locales={["fr", "en"]}
        links={links}
        labels={{
          nav: "Navigation principale",
          menu: "Menu",
        }}
      />
    </NextIntlClientProvider>,
  );
}

/**
 * Bloc 132 §3, révisé par le Bloc 141 : sur mobile, l'en-tête tient sur une
 * ligne, et **un seul** bouton ouvre le panneau — le menu. La loupe menait au
 * même endroit, le champ de recherche étant le premier élément du panneau :
 * c'était un doublon fonctionnel, pas seulement visuel.
 *
 * Ce que ces tests gardent : les trois boutons qui restent, l'absence de la
 * loupe, et le fait que le panneau s'ouvre sans rien attraper — le champ de
 * recherche reste simplement atteignable, il ne réclame pas le focus.
 */
describe("PublicHeader", () => {
  it("part panneau fermé, le bouton menu le disant", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  /**
   * Bloc 141 : la barre porte trois boutons, pas quatre. La langue et le
   * thème nomment leur état courant, donc on les cherche par ce que leur
   * `aria-label` contient plutôt que par un libellé figé.
   */
  it("ne porte que trois boutons : langue, thème, menu", () => {
    renderHeader();
    const actions = document.querySelector(".public-header-actions")!;
    const buttons = within(actions as HTMLElement).getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[2]).toHaveAccessibleName("Menu");
  });

  it("n'a plus de bouton recherche dédié", () => {
    renderHeader();
    // Le libellé reste celui du **champ**, qui le garde : c'est un bouton
    // portant ce nom qui ne doit plus exister.
    expect(
      screen.queryByRole("button", { name: "Rechercher sur le site" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".public-header-search"),
      "la classe du bouton retiré ne doit subsister nulle part",
    ).toBeNull();
    // Le champ, lui, est toujours là et toujours nommé.
    expect(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
    ).toBeInTheDocument();
  });

  it("ouvre et referme depuis le menu", () => {
    renderHeader();
    const menu = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("referme le panneau quand on part sur une page", () => {
    renderHeader();
    const menu = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(menu);
    fireEvent.click(screen.getByRole("link", { name: "Guides" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  /**
   * Retour de revue : suivre un résultat de recherche mène ailleurs tout
   * autant qu'un lien de navigation. Le gabarit public survit à la
   * navigation, donc un panneau laissé ouvert recouvrait la page d'arrivée
   * — reproduit au navigateur en 393 px avant correction.
   */
  it("referme le panneau quand on suit un résultat de recherche", async () => {
    renderHeader([
      {
        id: "g1",
        slug: "bien-debuter",
        title: "Bien débuter",
        excerpt: "Les bases du jeu.",
      },
    ]);
    const menu = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(menu);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "bien" },
    });
    fireEvent.click(await screen.findByRole("link", { name: /Bien débuter/ }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  /**
   * Bloc 141 : ouvrir le menu ne déplace le focus nulle part. La loupe le
   * posait dans le champ ; le menu ne reprend pas ce geste, sans quoi le
   * clavier logiciel se lèverait à chaque ouverture du panneau, y compris
   * pour qui l'ouvre seulement pour naviguer. Le champ reste ce qu'il doit
   * être : présent, nommé, et focusable quand on le lui demande.
   */
  it("ouvre le panneau sans prendre le focus, le champ restant focusable", async () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const field = screen.getByRole("searchbox", {
      name: "Rechercher sur le site",
    });
    // Le focus retiré se posait dans une frame d'animation : l'affirmation
    // doit survivre à ce délai pour mordre si quelqu'un le réintroduit.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(field).not.toHaveFocus();

    field.focus();
    expect(field).toHaveFocus();
  });

  it("désigne le panneau que le bouton menu commande", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-controls",
      "public-header-panel",
    );
  });
});
