import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { DescriptionCell } from "./admin-description-cell";
import type { ToolDescription } from "@/lib/tool-description";

afterEach(cleanup);

const languageNames = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  es: "Español",
  tr: "Türkçe",
};

function renderCell(description: ToolDescription, canEdit = true) {
  render(
    <DescriptionCell
      row={{ label: "Coût de Ville", description }}
      canEdit={canEdit}
      languageNames={languageNames}
      onOpen={vi.fn()}
    />,
  );
}

/** Les cinq puces, dans l'ordre où elles sont rendues. */
const chips = () =>
  screen
    .getAllByTitle(/description (écrite|à écrire)$/)
    .map((chip) => chip.getAttribute("title"));

/**
 * Bloc 131/A : la couverture linguistique d'une description, en puces.
 *
 * Elle était un compte — « aucune langue », « 3 langues » — qui dit combien
 * il en manque et jamais lesquelles. Ce que ces tests tiennent, c'est
 * précisément ce que le compte ne disait pas : quelles langues sont écrites,
 * langue par langue, et pas seulement combien.
 */
describe("Bloc 131/A — les puces de langue d'une description", () => {
  it("met les cinq langues en pointillés quand rien n'est écrit", () => {
    renderCell({});
    expect(chips()).toEqual([
      "Français : description à écrire",
      "English : description à écrire",
      "Deutsch : description à écrire",
      "Español : description à écrire",
      "Türkçe : description à écrire",
    ]);
    // Le compte qu'elles remplacent ne doit pas survivre à côté d'elles.
    expect(screen.queryByText(/aucune langue|langues?$/)).toBeNull();
  });

  it("distingue les langues écrites des autres, une à une", () => {
    renderCell({ fr: "Le prix d’une ville.", de: "Der Preis einer Stadt." });
    expect(chips()).toEqual([
      "Français : description écrite",
      "English : description à écrire",
      "Deutsch : description écrite",
      "Español : description à écrire",
      "Türkçe : description à écrire",
    ]);
  });

  /**
   * Une chaîne d'espaces n'est pas une description : c'est la règle que le
   * compte appliquait déjà, et la puce la garde.
   */
  it("ne compte pas une langue remplie d'espaces", () => {
    renderCell({ fr: "   " });
    expect(chips()[0]).toBe("Français : description à écrire");
  });

  // Le trait plein ou pointillé porte l'information, et un code de langue
  // lu seul ne dit rien : la phrase entière est dans la puce, en texte
  // masqué, faute de quoi la colonne se lirait « fr en de es tr ».
  it("dit en toutes lettres ce que le trait montre", () => {
    renderCell({ fr: "Le prix d’une ville." });
    const written = screen.getByTitle("Français : description écrite");
    expect(within(written).getByText("fr")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      within(written).getByText("Français : description écrite"),
    ).toHaveClass("sr-only");
  });

  it("garde les puces pour un lecteur, et lui retire le bouton", () => {
    renderCell({ fr: "Le prix d’une ville." }, false);
    expect(chips()).toHaveLength(5);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("ouvre le panneau depuis le bouton nommé par sa ligne", () => {
    renderCell({});
    expect(
      screen.getByRole("button", { name: "Décrire Coût de Ville" }),
    ).toBeInTheDocument();
  });

  /**
   * Relevé sur les captures de la PR #155 : les cinq puces s'empilaient
   * l'une sous l'autre, une par ligne.
   *
   * La colonne est déclarée `narrow`, donc dimensionnée au contenu — et le
   * navigateur prend pour ça la largeur *minimale* du contenu. Une rangée
   * qui a le droit de passer à la ligne a pour largeur minimale celle de son
   * plus large enfant : une puce. Mesuré avant le correctif, 31 px de
   * rangée dans une cellule de 172 px ; après, 170 px de rangée dans une
   * cellule de 313 px, sur une seule ligne de 1024 à 1440 px.
   *
   * jsdom ne met rien en page : ce test tient la classe qui l'obtient, et
   * l'absence de celle qui l'empêchait. La mesure, elle, est au navigateur.
   */
  it("garde les cinq puces sur une seule ligne", () => {
    renderCell({ fr: "Le prix d’une ville." });
    const group = screen.getByTitle("Français : description écrite")
      .parentElement as HTMLElement;
    expect(group).toHaveClass("min-w-max");
    // `flex-wrap` est ce qui autorisait la colonne à se refermer sur une
    // puce : la rangée ne l'a plus.
    expect(group).not.toHaveClass("flex-wrap");
    expect(group.querySelectorAll("[title]")).toHaveLength(5);
  });
});
