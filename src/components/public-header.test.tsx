import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
          search: "Rechercher sur le site",
        }}
      />
    </NextIntlClientProvider>,
  );
}

/**
 * Bloc 132 §3 : sur mobile, l'en-tête tient sur une ligne et deux boutons
 * ouvrent le même panneau — la loupe et le menu. C'est cette bascule
 * partagée que les tests suivants gardent : deux commandes, un seul état,
 * et un focus qui suit la loupe.
 */
describe("PublicHeader", () => {
  it("part panneau fermé, les deux boutons le disant", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Rechercher sur le site" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("ouvre et referme depuis le menu", () => {
    renderHeader();
    const menu = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  // Les deux boutons commandent le même panneau : ouvrir par la loupe doit
  // se lire sur le menu aussi, sinon un lecteur d'écran annonce un état qui
  // n'est plus vrai.
  it("partage l'état entre la loupe et le menu", () => {
    renderHeader();
    fireEvent.click(
      screen.getByRole("button", { name: "Rechercher sur le site" }),
    );
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
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
    const search = screen.getByRole("button", {
      name: "Rechercher sur le site",
    });
    fireEvent.click(search);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "bien" },
    });
    fireEvent.click(await screen.findByRole("link", { name: /Bien débuter/ }));
    expect(search).toHaveAttribute("aria-expanded", "false");
  });

  // La loupe ouvre pour écrire : sans le focus, il faudrait viser le champ
  // après l'avoir fait apparaître.
  it("place le focus dans le champ de recherche depuis la loupe", async () => {
    renderHeader();
    fireEvent.click(
      screen.getByRole("button", { name: "Rechercher sur le site" }),
    );
    const field = screen.getByRole("searchbox");
    await vi.waitFor(() => expect(field).toHaveFocus());
  });

  it("désigne le panneau que les deux boutons commandent", () => {
    renderHeader();
    for (const name of ["Menu", "Rechercher sur le site"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-controls",
        "public-header-panel",
      );
    }
  });
});
