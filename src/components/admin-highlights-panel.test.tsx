import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
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

/**
 * Le cas « rien d'enregistré » se rend à part : `renderPanel(undefined)`
 * retomberait sur la valeur par défaut du paramètre, c'est-à-dire sur la
 * liste vide — exactement les deux états que ce fichier sépare.
 */
function renderUnset() {
  render(<AdminHighlightsPanel candidates={candidates} initial={undefined} />);
}

/** Les cinq listes déroulantes, dans l'ordre des emplacements. */
const slots = () =>
  Array.from({ length: 5 }, (_, index) =>
    screen.getByLabelText(`Emplacement ${index + 1}`),
  ) as HTMLSelectElement[];

/** Ce que chaque emplacement affiche, vide compris. */
const chosen = () =>
  slots().map(
    (slot) => slot.selectedOptions[0]?.textContent ?? "",
  );

/** Les options proposées par un emplacement, « Aucun » exclu. */
const optionsOf = (index: number) =>
  Array.from(slots()[index].options)
    .filter((option) => option.value !== "")
    .map((option) => option.textContent ?? "");

/** Choisir dans un emplacement, par la valeur `kind:slug`. */
const pick = (index: number, value: string) =>
  fireEvent.change(slots()[index], { target: { value } });

// Bloc 136 : le panneau redemande l'écran après un enregistrement, pour
// que le résumé de la section — calculé sur le serveur — suive.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

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

  it("rend cinq emplacements, chacun listant guides, outils et référentiels", () => {
    renderPanel();
    expect(slots()).toHaveLength(5);
    // Chaque liste porte la totalité des candidats, les trois natures
    // mélangées — c'est ce que le bloc demande.
    const options = optionsOf(0);
    expect(options).toHaveLength(candidates.length);
    for (const candidate of candidates)
      expect(options.some((option) => option.includes(candidate.name))).toBe(
        true,
      );
  });

  it("part de la sélection enregistrée, dans son ordre", () => {
    renderPanel([
      { kind: "reference", slug: "gems" },
      { kind: "tool", slug: "city-cost" },
    ]);
    expect(chosen()[0]).toContain("Gemmes");
    expect(chosen()[1]).toContain("Coût de Ville");
    // Les trois places restantes sont vides, et se voient comme telles.
    expect(chosen()[2]).toBe("— Aucun —");
  });

  /**
   * Le filtrage des doublons : ce qu'un emplacement a pris disparaît des
   * quatre autres. C'est la garantie qui empêche une entrée d'occuper deux
   * places.
   */
  it("retire des autres emplacements ce qu'un emplacement a pris", () => {
    renderPanel();
    expect(optionsOf(1).some((option) => option.includes("Gemmes"))).toBe(true);
    pick(0, "reference:gems");
    for (const index of [1, 2, 3, 4])
      expect(
        optionsOf(index).some((option) => option.includes("Gemmes")),
        `emplacement ${index + 1}`,
      ).toBe(false);
    // Et l'emplacement qui l'a prise la garde, sans quoi elle ne pourrait
    // plus s'afficher.
    expect(chosen()[0]).toContain("Gemmes");
  });

  it("la rend de nouveau disponible quand on la repose", () => {
    renderPanel([{ kind: "reference", slug: "gems" }]);
    expect(optionsOf(1).some((option) => option.includes("Gemmes"))).toBe(
      false,
    );
    pick(0, "");
    for (const index of [0, 1, 2, 3, 4])
      expect(
        optionsOf(index).some((option) => option.includes("Gemmes")),
        `emplacement ${index + 1}`,
      ).toBe(true);
  });

  /**
   * La limite de cinq n'a plus besoin d'être annoncée : il n'existe que cinq
   * champs. Un sixième candidat reste proposé dans chaque liste — non pas
   * pour s'ajouter, mais pour **remplacer** ce que la place tient déjà, ce
   * qui est le seul geste qu'un champ sait faire.
   */
  it("s'en tient à cinq entrées même quand tout est choisi", async () => {
    renderPanel();
    for (const [index, value] of [
      "tool:city-cost",
      "tool:city-production",
      "reference:gems",
      "reference:shop",
      "guide:bien-debuter",
    ].entries())
      pick(index, value);
    expect(slots()).toHaveLength(5);
    // Le sixième reste proposé : il remplacerait celui de la place.
    expect(optionsOf(2).some((option) => option.includes("Le clan"))).toBe(
      true,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).highlights).toHaveLength(5);
  });

  it("envoie la sélection dans son ordre", async () => {
    renderPanel([{ kind: "tool", slug: "city-cost" }]);
    pick(1, "reference:gems");
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
    // Bloc 136, revue Codex (PR #156) : « n / 5 sélectionnés » vient du
    // serveur, et resterait sur l'ancien compte sans cette demande.
    expect(refresh).toHaveBeenCalled();
  });

  // Une sélection vidée est un choix — « ne montre rien » — et doit pouvoir
  // s'enregistrer telle quelle.
  it("sait enregistrer une sélection vide", async () => {
    renderPanel([{ kind: "tool", slug: "city-cost" }]);
    pick(0, "");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ highlights: [] });
  });

  /**
   * Retour de revue : rien d'enregistré et une liste vide enregistrée ne
   * veulent pas dire la même chose. `undefined`, c'est l'accueil sur sa
   * liste de repli ; `[]`, c'est le panneau masqué exprès. Confondus, une
   * installation neuve s'affichait comme un panneau volontairement masqué,
   * et le message annonçait le repli alors qu'il ne s'appliquait plus.
   */
  it("distingue « rien d'enregistré » d'une sélection vide enregistrée", () => {
    renderUnset();
    expect(
      screen.getByText(
        "Aucune entrée sélectionnée. L’accueil affiche sa liste par défaut.",
      ),
    ).toBeInTheDocument();
    cleanup();
    renderPanel([]);
    expect(
      screen.getByText(
        "Sélection vide enregistrée : le panneau est masqué sur l’accueil.",
      ),
    ).toBeInTheDocument();
  });

  // Et une fois la sélection vidée puis enregistrée, le message suit : le
  // repli ne s'applique plus, la page ne doit plus l'annoncer.
  it("passe au message « panneau masqué » après un enregistrement à vide", async () => {
    renderUnset();
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    expect(
      await screen.findByText(
        "Sélection vide enregistrée : le panneau est masqué sur l’accueil.",
      ),
    ).toBeInTheDocument();
  });

  /**
   * Une entrée dont la cible a disparu (guide dépublié depuis) reste
   * visible et retirable : la masquer la rendrait impossible à enlever, et
   * elle occuperait une des cinq places sans qu'on sache laquelle.
   */
  it("montre une entrée orpheline plutôt que de la cacher", () => {
    renderPanel([{ kind: "guide", slug: "guide-disparu" }]);
    // Elle reste affichée, nommée par son identifiant — tout ce qui reste
    // d'une cible disparue.
    expect(chosen()[0]).toContain("guide-disparu");
    // Et elle reste modifiable : reposer l'emplacement la retire.
    pick(0, "");
    expect(chosen()[0]).toBe("— Aucun —");
  });

  /**
   * Revue Codex (PR #172) : et l'écran suit ce qui est parti. Le serveur
   * reçoit la sélection tassée ; si les champs gardaient leur trou,
   * « Emplacement 4 » continuerait d'afficher une entrée que l'accueil place
   * en deuxième position. `router.refresh()` ne le corrige pas : il ne
   * remonte pas un composant client.
   */
  it("tasse aussi les champs après un enregistrement réussi", async () => {
    renderPanel();
    pick(0, "tool:city-cost");
    pick(3, "guide:clan");
    expect(chosen()[1]).toBe("— Aucun —");
    expect(chosen()[3]).toContain("Le clan");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await waitFor(() => expect(chosen()[1]).toContain("Le clan"));
    expect(chosen()[3]).toBe("— Aucun —");
  });

  /**
   * Un trou au milieu n'est pas un état à enregistrer : les entrées choisies
   * partent dans leur ordre, sans la place vide qui les sépare à l'écran.
   */
  it("referme les trous à l'enregistrement", async () => {
    renderPanel();
    pick(0, "tool:city-cost");
    pick(3, "guide:clan");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la sélection" }),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      highlights: [
        { kind: "tool", slug: "city-cost" },
        { kind: "guide", slug: "clan" },
      ],
    });
  });
});
