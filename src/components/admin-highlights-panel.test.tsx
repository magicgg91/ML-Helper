import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import {
  AdminHighlightsPanel,
  type HighlightCandidate,
} from "./admin-highlights-panel";
import type { HomeHighlight } from "@/lib/home-highlights";

const candidates: HighlightCandidate[] = [
  { kind: "tool", slug: "city-cost", name: "Coût de Ville" },
  { kind: "tool", slug: "city-production", name: "Production" },
  { kind: "reference", slug: "gems", name: "Gemmes" },
  { kind: "reference", slug: "shop", name: "Boutique" },
  { kind: "guide", slug: "bien-debuter", name: "Bien débuter" },
  { kind: "guide", slug: "clan", name: "Le clan" },
];

function renderPanel(initial: HomeHighlight[] = []) {
  render(<AdminHighlightsPanel candidates={candidates} initial={initial} />);
}

/** Les noms de la sélection, dans l'ordre affiché. */
const selectedNames = () =>
  within(screen.getByTestId("highlights-selected"))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

const add = (name: string) =>
  fireEvent.click(
    screen.getByRole("button", { name: `Ajouter ${name} à la sélection` }),
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Bloc 132 §4 : la sélection éditoriale, côté administration.
 *
 * L'ordre est la moitié du réglage — c'est celui de l'accueil — donc il est
 * testé au même titre que l'appartenance à la liste.
 */
describe("AdminHighlightsPanel", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
  });

  it("part de la sélection enregistrée, dans son ordre", () => {
    renderPanel([
      { kind: "reference", slug: "gems" },
      { kind: "tool", slug: "city-cost" },
    ]);
    expect(selectedNames()).toEqual([
      expect.stringContaining("Gemmes"),
      expect.stringContaining("Coût de Ville"),
    ]);
  });

  it("ajoute à la fin, et retire l'entrée de la liste des candidats", () => {
    renderPanel();
    add("Le clan");
    expect(selectedNames()).toEqual([expect.stringContaining("Le clan")]);
    expect(
      screen.queryByRole("button", { name: "Ajouter Le clan à la sélection" }),
    ).toBeNull();
  });

  it("retire une entrée et la rend de nouveau proposable", () => {
    renderPanel([{ kind: "guide", slug: "clan" }]);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer Le clan" }));
    expect(screen.queryByTestId("highlights-selected")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Ajouter Le clan à la sélection" }),
    ).toBeInTheDocument();
  });

  it("monte et descend une entrée", () => {
    renderPanel([
      { kind: "tool", slug: "city-cost" },
      { kind: "guide", slug: "clan" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Monter Le clan" }));
    expect(selectedNames()[0]).toContain("Le clan");
    fireEvent.click(screen.getByRole("button", { name: "Descendre Le clan" }));
    expect(selectedNames()[0]).toContain("Coût de Ville");
  });

  // Cinq places : au-delà, il faut choisir, et le panneau le dit plutôt que
  // de laisser cliquer pour rien.
  it("bloque l'ajout à cinq entrées", () => {
    renderPanel();
    for (const name of [
      "Coût de Ville",
      "Production",
      "Gemmes",
      "Boutique",
      "Bien débuter",
    ])
      add(name);
    expect(selectedNames()).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Ajouter Le clan à la sélection" }),
    ).toBeDisabled();
  });

  it("filtre les candidats sur la recherche", () => {
    renderPanel();
    fireEvent.change(
      screen.getByLabelText("Chercher un guide, un outil ou un référentiel"),
      { target: { value: "gem" } },
    );
    const list = within(screen.getByTestId("highlights-candidates"));
    expect(list.getAllByRole("listitem")).toHaveLength(1);
    expect(list.getByText("Gemmes")).toBeInTheDocument();
  });

  it("envoie la sélection dans son ordre", async () => {
    renderPanel([{ kind: "tool", slug: "city-cost" }]);
    add("Gemmes");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("/api/admin/config/highlights");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({
      highlights: [
        { kind: "tool", slug: "city-cost" },
        { kind: "reference", slug: "gems" },
      ],
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sélection enregistrée.",
    );
  });

  // Une sélection vidée est un choix — « ne montre rien » — et doit pouvoir
  // s'enregistrer telle quelle.
  it("sait enregistrer une sélection vide", async () => {
    renderPanel([{ kind: "tool", slug: "city-cost" }]);
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer Coût de Ville" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ highlights: [] });
  });

  /**
   * Une entrée dont la cible a disparu (guide dépublié depuis) reste
   * visible et retirable : la masquer la rendrait impossible à enlever, et
   * elle occuperait une des cinq places sans qu'on sache laquelle.
   */
  it("montre une entrée orpheline plutôt que de la cacher", () => {
    renderPanel([{ kind: "guide", slug: "guide-disparu" }]);
    expect(selectedNames()[0]).toContain("guide-disparu");
    expect(
      screen.getByRole("button", { name: "Supprimer guide-disparu" }),
    ).toBeInTheDocument();
  });
});
