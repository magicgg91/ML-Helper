import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fr from "../../messages/fr.json";
import {
  CollapsibleSection,
  useSectionDirty,
} from "./admin-collapsible-section";
import { Pill } from "./admin-pill";

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = "";
  // jsdom ne met rien en page et n'implémente pas scrollIntoView : la
  // doublure permet d'affirmer qu'on l'appelle, ce qui est la moitié de
  // « l'ancre amène la section à l'écran ».
  Element.prototype.scrollIntoView = vi.fn();
});

function renderSection(
  props: Partial<Parameters<typeof CollapsibleSection>[0]> = {},
) {
  // `children` est extrait du reste : écrit en enfant JSX, il l'emporterait
  // sur celui que le test passe, et chaque test recevrait le panneau par
  // défaut sans le dire.
  const { children = <p>Contenu de la section</p>, ...rest } = props;
  return render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      <CollapsibleSection
        id="langues"
        title="Langues"
        description="Les langues du site public."
        summary={<Pill tone="neutral">3 actives sur 5</Pill>}
        {...rest}
      >
        {children}
      </CollapsibleSection>
    </NextIntlClientProvider>,
  );
}

const header = () => screen.getByRole("button", { name: "Langues" });
const panel = () => screen.getByText("Contenu de la section").parentElement!;

/**
 * Bloc 136 : les sections de Configuration se replient, et s'ouvrent
 * repliées.
 *
 * Le Bloc 100/C les avait repliables, le Bloc 119 les a dépliées pour de
 * bon ; l'écran a grossi depuis et la décision s'inverse. Ce que ces tests
 * tiennent, c'est ce qui rend le repli acceptable : l'état reste lisible
 * sans ouvrir, une ancre ouvre la bonne section, et replier ne coûte jamais
 * une saisie.
 */
describe("Bloc 136 — une section repliable de Configuration", () => {
  it("s'ouvre repliée, résumé visible", () => {
    renderSection();
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(panel()).not.toBeVisible();
    // Ce qu'on vient chercher sans ouvrir : le titre, la raison d'être et
    // l'état.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Langues",
    );
    expect(screen.getByText("Les langues du site public.")).toBeVisible();
    expect(screen.getByText("3 actives sur 5")).toBeVisible();
  });

  it("déplie et replie au clic", () => {
    renderSection();
    fireEvent.click(header());
    expect(header()).toHaveAttribute("aria-expanded", "true");
    expect(panel()).toBeVisible();
    fireEvent.click(header());
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(panel()).not.toBeVisible();
  });

  /**
   * Entrée et Espace sont l'affaire du navigateur dès lors que l'en-tête est
   * un vrai <button> : ce test tient donc l'élément, pas deux gestionnaires
   * de touches réécrits à la main — qui seraient précisément la façon de
   * perdre l'un des deux.
   */
  it("est un bouton, donc Entrée et Espace l'ouvrent", () => {
    renderSection();
    expect(header().tagName).toBe("BUTTON");
    expect(header()).toHaveAttribute("type", "button");
    // L'anneau de focus commun à toute l'administration.
    expect(header()).toHaveClass("admin-focus");
  });

  /**
   * L'anneau de focus est dessiné 2 px en dehors du bouton, et le bouton
   * remplit la carte : un `overflow-hidden` sur la carte le découpe en
   * entier. Vu au navigateur — `:focus-visible` actif, outline calculée à
   * 2 px, et rien à l'écran — d'où ce test, que la classe seule suffit à
   * tenir puisque c'est elle qui rognait.
   */
  it("ne rogne pas l'anneau de focus de son en-tête", () => {
    renderSection();
    expect(header().closest("section")).not.toHaveClass("overflow-hidden");
  });

  it("relie l'en-tête au panneau qu'il commande", () => {
    renderSection();
    expect(header().getAttribute("aria-controls")).toBe(panel().id);
    // Nommé par son titre seul : sans ça le bouton s'appellerait « Langues
    // Les langues du site public 3 actives sur 5 ».
    expect(header()).toHaveAccessibleName("Langues");
    expect(header()).toHaveAccessibleDescription("Les langues du site public.");
  });

  /**
   * Tout l'en-tête vit dans le <h2>, et globals.css donne aux titres une
   * fonte d'affichage en capitales : sans ces deux classes, la description
   * et les pastilles se lisaient en petites capitales serif — vu au
   * navigateur avant correction. jsdom n'applique aucune feuille de style,
   * donc ce test tient les classes, pas le rendu ; le rendu, lui, a été
   * mesuré (fontSans 14px, identique à la carte d'avant).
   */
  it("laisse la fonte d'affichage au seul titre", () => {
    renderSection();
    expect(screen.getByText("Les langues du site public.")).toHaveClass(
      "font-admin-body",
    );
    expect(screen.getByText("3 actives sur 5").parentElement).toHaveClass(
      "font-admin-body",
    );
    expect(screen.getByText("Langues")).toHaveClass("admin-section-title");
  });

  it("garde le contenu monté quand on replie", () => {
    renderSection({
      children: <input aria-label="Saisie" defaultValue="" />,
    });
    fireEvent.click(header());
    const field = screen.getByLabelText("Saisie");
    fireEvent.change(field, { target: { value: "une saisie en cours" } });
    fireEvent.click(header());
    // Replié : masqué, jamais démonté — un remontage remettrait le champ à
    // zéro, ce que ce test refuse.
    expect(screen.getByLabelText("Saisie")).toHaveValue("une saisie en cours");
    fireEvent.click(header());
    expect(screen.getByLabelText("Saisie")).toHaveValue("une saisie en cours");
  });
});

describe("Bloc 136 — l'ancre ouvre la section visée", () => {
  it("ouvre celle que l'URL désigne, et l'amène à l'écran", () => {
    window.location.hash = "#langues";
    renderSection();
    expect(header()).toHaveAttribute("aria-expanded", "true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("laisse les autres repliées", () => {
    window.location.hash = "#suivi-visites";
    renderSection();
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  // Passer d'une ancre à l'autre sans quitter la page : le lien ne recharge
  // rien, seul `hashchange` le dit.
  it("suit un changement d'ancre sur la page déjà ouverte", () => {
    renderSection();
    expect(header()).toHaveAttribute("aria-expanded", "false");
    window.location.hash = "#langues";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(header()).toHaveAttribute("aria-expanded", "true");
  });
});

/**
 * La pastille « Modifié » : ce qui empêche une section repliée de cacher du
 * travail en attente. Le panneau la déclenche, parce que lui seul sait ce
 * qu'il a d'enregistré.
 */
describe("Bloc 136 — la pastille d'une saisie non enregistrée", () => {
  function Panel({ dirty }: { dirty: boolean }) {
    useSectionDirty(dirty);
    return <p>Contenu de la section</p>;
  }

  it("n'apparaît pas tant que rien n'a changé", () => {
    renderSection({ children: <Panel dirty={false} /> });
    expect(screen.queryByText("Modifié")).toBeNull();
  });

  it("apparaît dans l'en-tête, section repliée", () => {
    renderSection({ children: <Panel dirty /> });
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Modifié")).toBeVisible();
    // Le résumé de l'état ne disparaît pas pour autant : les deux se lisent.
    expect(screen.getByText("3 actives sur 5")).toBeVisible();
  });

  it("suit le panneau quand il redevient propre", () => {
    const { rerender } = renderSection({ children: <Panel dirty /> });
    expect(screen.getByText("Modifié")).toBeInTheDocument();
    rerender(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <CollapsibleSection id="langues" title="Langues">
          <Panel dirty={false} />
        </CollapsibleSection>
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText("Modifié")).toBeNull();
  });

  // Hors d'une section repliable, le panneau reste montable tel quel : le
  // crochet ne trouve personne à prévenir et n'en fait pas une erreur.
  it("ne demande pas de section autour du panneau", () => {
    expect(() =>
      render(
        <NextIntlClientProvider locale="fr" messages={fr}>
          <Panel dirty />
        </NextIntlClientProvider>,
      ),
    ).not.toThrow();
  });
});
