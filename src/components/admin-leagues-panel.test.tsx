import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { LeagueLadder } from "../lib/leagues";
import { AdminLeaguesPanel } from "./admin-leagues-panel";
import { CollapsibleSection } from "./admin-collapsible-section";

const replace = vi.fn();
const refresh = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => new URLSearchParams(search),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.restoreAllMocks();
  replace.mockClear();
  refresh.mockClear();
  search = "";
});

const ladder: LeagueLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    name: {},
    position: 0,
    active: true,
    bands: [
      {
        threshold: 10,
        movement: "promotion",
        target: "silver",
        rewards: [{ type: "sapphires", quantity: 300 }],
      },
      { threshold: 100, movement: "stay", target: "bronze", rewards: [] },
    ],
  },
  {
    id: "silver",
    league: "silver",
    division: "",
    name: {},
    position: 1,
    active: false,
    bands: [],
  },
];

function renderEditor(initial: LeagueLadder = ladder) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(<AdminLeaguesPanel initialLadder={structuredClone(initial)} />);
  return request;
}

const entryList = () =>
  screen.getByRole("navigation", { name: "Ligues et divisions" });
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

describe("Bloc 119: the Classement editor", () => {
  it("lists every rung with its state and how many bands it has", () => {
    renderEditor();
    const entries = within(entryList()).getAllByRole("button");
    expect(entries[0]).toHaveTextContent("Bronze");
    expect(entries[0]).toHaveTextContent("2 plages");
    expect(entries[1]).toHaveTextContent("aucune plage");
  });

  it("opens on the first rung and shows only that one", () => {
    renderEditor();
    expect(screen.getByText("Entrée 1 sur 2")).toBeInTheDocument();
    // One detail pane, not a dozen stacked forms.
    expect(screen.getAllByLabelText(/ligue de base/)).toHaveLength(1);
  });

  it("puts the selected rung in the URL, so it is a link", () => {
    renderEditor();
    fireEvent.click(within(entryList()).getAllByRole("button")[1]);
    expect(replace).toHaveBeenCalledWith("/admin/config?rung=silver", {
      scroll: false,
    });
  });

  it("opens the rung the URL names", () => {
    search = "rung=silver";
    renderEditor();
    expect(screen.getByText("Entrée 2 sur 2")).toBeInTheDocument();
  });

  it("keeps edits made on a rung you have switched away from", async () => {
    search = "rung=silver";
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText(/nom libre FR/), {
      target: { value: "Argent I" },
    });
    // Switching panes is a view change, not a form reset: one draft ladder
    // sits behind both, and one save covers all of it.
    search = "rung=bronze";
    cleanup();
    render(<AdminLeaguesPanel initialLadder={structuredClone(ladder)} />);
    expect(screen.getByText("Entrée 1 sur 2")).toBeInTheDocument();
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
  });

  it("saves the whole ladder, with each rung's position as its index", async () => {
    const request = renderEditor();
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][0]).toBe("/api/admin/config/leagues");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body).toMatchObject([
      { id: "bronze", position: 0, league: "bronze", active: true },
      { id: "silver", position: 1, league: "silver", active: false },
    ]);
    // Bloc 137 : l'identité seule part d'ici. Les plages sont le classement,
    // donc le paramètre de l'outil, et c'est son écran qui les envoie — la route
    // reporte cette liste sur les plages déjà stockées.
    expect(body[0]).not.toHaveProperty("bands");
  });

  it("moves a rung from the ⋯ menu, keyboard and all", async () => {
    const request = renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Autres actions pour Bronze" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Descendre Bronze" }));
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.map((entry: { id: string }) => entry.id)).toEqual([
      "silver",
      "bronze",
    ]);
  });

  it("reorders by dragging one rung onto another", async () => {
    const request = renderEditor();
    const items = within(entryList()).getAllByRole("listitem");
    fireEvent.dragStart(items[1]);
    fireEvent.drop(items[0]);
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.map((entry: { id: string }) => entry.id)).toEqual([
      "silver",
      "bronze",
    ]);
  });

  it("switches a rung's public visibility from the header", () => {
    renderEditor();
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "true");
    fireEvent.click(control);
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Masquée")).toBeInTheDocument();
  });

  it("asks before deleting a rung and its bands", () => {
    renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Autres actions pour Bronze" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Supprimer l’entrée" }),
    );
    expect(
      screen.getByText("Supprimer cette entrée et toutes ses plages ?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(within(entryList()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("adds a rung, selects it, and leaves it hidden until somebody says otherwise", () => {
    renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une ligue ou une division" }),
    );
    const entries = within(entryList()).getAllByRole("listitem");
    expect(entries).toHaveLength(3);
    expect(entries[2]).toHaveTextContent("Entrée sans nom");
    // Bloc 108/G: a new rung is being prepared, not published.
    expect(entries[2].querySelector(".bg-admin-rule")).not.toBeNull();
    expect(replace).toHaveBeenCalled();
  });
});

/**
 * Bloc 131/C : un refus d'enregistrement qui dit où ça coince.
 *
 * Reproduit au navigateur avant d'être corrigé : un seuil à 150 sur une
 * entrée qu'on ne regardait pas, un clic sur Enregistrer, et « Corrige les
 * champs signalés avant l'enregistrement » — alors qu'aucun champ n'était
 * signalé nulle part, et que l'entrée fautive restait fermée.
 *
 * L'écran est un maître/détail : le refus doit donc ouvrir l'entrée, poser
 * le curseur sur le champ, et l'entourer. Les trois sont tenus ici.
 */
/**
 * Bloc 131/C, recoupé au Bloc 137 : ce qui empêche l'enregistrement, et où.
 *
 * Ce panneau ne valide plus que l'identité d'un échelon — les seuils et les
 * récompenses sont validés par l'écran de l'outil Classement, et leurs cas ont
 * suivi dans `admin-ranking-editor.test.tsx`. La mécanique est la même : le
 * bandeau nomme, le champ est entouré, le curseur y va, et l'échelon fautif
 * s'ouvre même si ce n'est pas celui qu'on regarde.
 */
describe("Bloc 131/C — dire où l'enregistrement coince", () => {
  const league = () => screen.getByLabelText(/ligue de base/);
  const banner = () => screen.getByRole("status");
  /**
   * Le cas qui rendait le refus muet : le champ fautif est dans une entrée
   * que le volet de droite ne montre pas. Le refus l'ouvre.
   */
  it("ouvre l'entrée fautive quand ce n'est pas celle qu'on regarde", async () => {
    // L'échelle de départ porte le défaut plutôt qu'une saisie :
    // `useSearchParams` est figé par le mock, donc la seule façon d'ouvrir
    // Argent est de partir d'elle — et le champ de Bronze n'est alors plus
    // atteignable à l'écran. Bloc 137 : le défaut est une identité vide (ni
    // ligue de base ni nom libre), la seule chose que ce panneau valide.
    search = "rung=silver";
    const broken = structuredClone(ladder);
    broken[0].league = null;
    renderEditor(broken);
    expect(screen.getByRole("heading", { name: "Argent" })).toBeInTheDocument();
    replace.mockClear();
    save();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("rung=bronze"),
        expect.anything(),
      ),
    );
  });

  it("refuse une entrée sans ligue ni nom, sur son sélecteur de ligue", async () => {
    renderEditor();
    fireEvent.change(league(), { target: { value: "" } });
    save();
    await waitFor(() =>
      expect(banner()).toHaveTextContent(
        // Bloc 135 : « dans au moins une langue » — le nom libre n'est plus
        // une paire FR/EN mais un objet sur les cinq langues du site.
        "Choisis une ligue de base, ou saisis un nom libre dans au moins une langue.",
      ),
    );
    expect(league()).toHaveAttribute("aria-invalid", "true");
    expect(league()).toHaveClass("border-admin-danger-ink");
    expect(league()).toHaveFocus();
  });

  it("enregistre sans rien signaler quand tout est bon", async () => {
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText(/division$/), {
      target: { value: "1" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  // Les marques suivent le refus, pas la saisie : Annuler les efface avec
  // les valeurs qu'elles visaient.
  it("efface les marques quand on revient aux valeurs enregistrées", async () => {
    renderEditor();
    fireEvent.change(league(), { target: { value: "" } });
    save();
    await waitFor(() =>
      expect(league()).toHaveAttribute("aria-invalid", "true"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    await waitFor(() =>
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(
        0,
      ),
    );
  });
});

/**
 * Bloc 131/D, tenu au Bloc 135 : pas de ligne d'introduction dans le panneau.
 *
 * Le titre et la phrase qui dit à quoi sert la section vivent maintenant dans
 * l'en-tête repliable, et c'est ce qu'on lit sans l'ouvrir. Une fois ouverte,
 * elle passe au travail : le panneau lui-même ne redit rien. Vérifié sur un
 * rendu réel, et non sur le paquet de traductions — une phrase écrite en dur
 * passerait sous le nez d'un test qui ne regarde que les clés.
 */
describe("Bloc 131/D — le panneau sans texte d'introduction", () => {
  it("commence par les actions et la liste, sans phrase avant", () => {
    renderEditor();
    // Aucun titre de niveau 1 : le panneau est le contenu d'une section, pas
    // un écran, et l'en-tête de la section porte déjà son <h2>.
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByText(/Ajoute, renomme, réordonne/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Enregistrer" }),
    ).toBeInTheDocument();
  });
});

/**
 * Bloc 135 §2 : le nom libre sur toutes les langues du site.
 *
 * Il était une paire FR/EN, saisie dans deux champs côte à côte. Il est
 * maintenant un objet par langue, derrière les mêmes onglets que la
 * description d'un outil et les pages légales — et les onglets disent
 * lesquelles sont déjà écrites, ce qui est la moitié de l'information quand on
 * arrive sur un échelon renommé il y a six mois.
 */
describe("Bloc 135 §2 — le nom libre, langue par langue", () => {
  const nameField = () => screen.getByLabelText(/nom libre FR/);
  const tab = (code: string) =>
    within(screen.getByRole("group", { name: "Nom libre en" })).getByText(
      code,
      {
        selector: "button",
      },
    );

  it("offre les cinq langues du site, et non la paire FR/EN", () => {
    renderEditor();
    const tabs = within(
      screen.getByRole("group", { name: "Nom libre en" }),
    ).getAllByRole("button");
    expect(tabs.map((button) => button.textContent)).toEqual([
      "fr",
      "en",
      "de",
      "es",
      "tr",
    ]);
    // Un seul champ : la langue affichée est celle de l'onglet actif.
    expect(screen.getAllByLabelText(/nom libre/)).toHaveLength(1);
  });

  it("enregistre un nom saisi dans une langue au-delà de FR et EN", async () => {
    const request = renderEditor();
    fireEvent.click(tab("de"));
    fireEvent.change(screen.getByLabelText(/nom libre DE/), {
      target: { value: "Bronzeliga" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body[0].name).toEqual({ de: "Bronzeliga" });
  });

  it("garde les autres langues en changeant d'onglet", async () => {
    const request = renderEditor();
    fireEvent.change(nameField(), { target: { value: "Bronze Élite" } });
    fireEvent.click(tab("es"));
    // Le champ montre l'espagnol, vide — ce que le français tient est gardé.
    expect(screen.getByLabelText(/nom libre ES/)).toHaveValue("");
    fireEvent.change(screen.getByLabelText(/nom libre ES/), {
      target: { value: "Bronce Élite" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body[0].name).toEqual({ fr: "Bronze Élite", es: "Bronce Élite" });
  });

  it("dit quelles langues restent à écrire", () => {
    renderEditor([
      {
        ...ladder[0],
        name: { fr: "Bronze Élite", de: "Bronzeliga" },
      },
      ladder[1],
    ]);
    // Écrites : plein. À écrire : en tirets — le même code que les pages
    // légales et la description d'un outil.
    expect(tab("fr")).not.toHaveClass("border-dashed");
    expect(tab("de")).not.toHaveClass("border-dashed");
    expect(tab("en")).toHaveClass("border-dashed");
    expect(tab("tr")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/à créer/),
    );
  });

  it("n'écrit pas une langue laissée blanche", async () => {
    const request = renderEditor();
    fireEvent.change(nameField(), { target: { value: "   " } });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body[0].name).toEqual({});
  });

  // Le résumé de la section (« n ligues/divisions, n actives ») est calculé
  // sur le serveur : sans cette demande, il resterait sur l'ancien compte
  // après un ajout ou une suppression.
  it("redemande l'écran après un enregistrement réussi", async () => {
    const request = renderEditor();
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("ne redemande rien quand le serveur refuse", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 400 }),
    );
    render(<AdminLeaguesPanel initialLadder={structuredClone(ladder)} />);
    save();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(refresh).not.toHaveBeenCalled();
  });
});

/**
 * Bloc 136 : le panneau vit dans une section repliable, et lui dit quand il
 * tient une saisie non enregistrée — sans quoi replier la section ferait
 * disparaître de l'écran un travail en cours sans le moindre signe.
 */
describe("Bloc 135 §2 — le panneau dans sa section", () => {
  const renderInSection = () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <CollapsibleSection id="ligues-divisions" title="Ligues et divisions">
        <AdminLeaguesPanel initialLadder={structuredClone(ladder)} />
      </CollapsibleSection>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ligues et divisions" }),
    );
  };

  it("signale une saisie non enregistrée à l'en-tête de la section", () => {
    renderInSection();
    expect(screen.queryByText("Modifié")).toBeNull();
    fireEvent.change(screen.getByLabelText(/nom libre FR/), {
      target: { value: "Bronze Élite" },
    });
    expect(screen.getByText("Modifié")).toBeInTheDocument();
  });

  it("retire le signal quand on revient aux valeurs enregistrées", () => {
    renderInSection();
    const field = screen.getByLabelText(/nom libre FR/);
    fireEvent.change(field, { target: { value: "Bronze Élite" } });
    expect(screen.getByText("Modifié")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByText("Modifié")).toBeNull();
  });
});
