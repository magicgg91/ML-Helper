import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { RankingLadder } from "../lib/ranking";
import { RankingAdminEditor } from "./admin-ranking-editor";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.restoreAllMocks();
  replace.mockClear();
  search = "";
});

const ladder: RankingLadder = [
  {
    id: "bronze",
    league: "bronze",
    division: "",
    nameFr: "",
    nameEn: "",
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
    nameFr: "",
    nameEn: "",
    position: 1,
    active: false,
    bands: [],
  },
];

function renderEditor(initial: RankingLadder = ladder) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(
    <RankingAdminEditor
      initialLadder={structuredClone(initial)}
      backHref="/admin/tools"
      backLabel="Outils"
      title="Seuils du classement"
    />,
  );
  return request;
}

const entryList = () =>
  screen.getByRole("navigation", { name: "Entrées du classement" });
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
    expect(replace).toHaveBeenCalledWith("/admin/tools/ranking?entry=silver");
  });

  it("opens the rung the URL names", () => {
    search = "entry=silver";
    renderEditor();
    expect(screen.getByText("Entrée 2 sur 2")).toBeInTheDocument();
  });

  it("keeps edits made on a rung you have switched away from", async () => {
    search = "entry=silver";
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText(/nom libre FR/), {
      target: { value: "Argent I" },
    });
    // Switching panes is a view change, not a form reset: one draft ladder
    // sits behind both, and one save covers all of it.
    search = "entry=bronze";
    cleanup();
    render(
      <RankingAdminEditor
        initialLadder={structuredClone(ladder)}
        backHref="/admin/tools"
        backLabel="Outils"
        title="Seuils du classement"
      />,
    );
    expect(screen.getByText("Entrée 1 sur 2")).toBeInTheDocument();
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
  });

  it("saves the whole ladder, with each rung's position as its index", async () => {
    const request = renderEditor();
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][0]).toBe("/api/admin/tools/ranking");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(
      body.map((entry: { id: string; position: number }) => entry),
    ).toMatchObject([
      { id: "bronze", position: 0 },
      { id: "silver", position: 1 },
    ]);
    expect(body[0].bands[0]).toMatchObject({
      threshold: 10,
      movement: "promotion",
      target: "silver",
      rewards: [{ type: "sapphires", quantity: 300 }],
    });
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

  it("sets a band's movement from three buttons, and clears it on a second click", () => {
    renderEditor();
    const group = screen.getAllByRole("radiogroup")[0];
    const promotion = within(group).getByRole("radio", { name: "Montée" });
    expect(promotion).toHaveAttribute("aria-checked", "true");
    fireEvent.click(promotion);
    // A band with no confirmed movement is a real state.
    expect(promotion).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(group).getByRole("radio", { name: "Descente" }));
    expect(
      within(group).getByRole("radio", { name: "Descente" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("refuses to save a band whose movement has no target", async () => {
    const request = renderEditor();
    const group = screen.getAllByRole("radiogroup")[0];
    // Clear the target while the movement stays set.
    fireEvent.change(screen.getByLabelText("Bronze ligne 1 Ligue cible"), {
      target: { value: "" },
    });
    expect(
      within(group).getByRole("radio", { name: "Montée" }),
    ).toHaveAttribute("aria-checked", "true");
    save();
    expect(
      await screen.findByText(
        "Mouvement et cible doivent être confirmés ensemble.",
      ),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
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
describe("Bloc 131/C — dire où l'enregistrement coince", () => {
  const threshold = (row: number) =>
    screen.getByLabelText(new RegExp(`ligne ${row} Seuil`));
  const league = () => screen.getByLabelText(/ligue de base/);
  const banner = () => screen.getByRole("status");
  /** Tout ce que `aria-describedby` rattache au champ, mis bout à bout. */
  const describedBy = (field: HTMLElement) =>
    (field.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

  it("n'envoie rien et nomme l'entrée, la plage et le champ", async () => {
    const request = renderEditor();
    fireEvent.change(threshold(1), { target: { value: "150" } });
    save();
    await waitFor(() =>
      expect(banner()).toHaveTextContent(
        "Enregistrement impossible : un champ à corriger. Bronze ligne 1 Seuil (%) : Entre 0 et 100 requis.",
      ),
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("entoure le champ fautif, y met le curseur et dit pourquoi", async () => {
    renderEditor();
    fireEvent.change(threshold(1), { target: { value: "0" } });
    save();
    const field = threshold(1);
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
    expect(field).toHaveClass("border-admin-danger-ink");
    expect(field).toHaveFocus();
    // La raison est rattachée au champ, pas seulement posée à côté. Le
    // seuil est décrit par deux éléments — son unité « % » et son erreur —
    // et `aria-describedby` les liste tous les deux.
    expect(describedBy(field)).toContain("Entre 0 et 100 requis.");
  });

  // « Envisage d'indiquer les autres aussi » : ils le sont tous, et le
  // compte du bandeau le dit.
  it("signale tous les champs fautifs, pas seulement le premier", async () => {
    renderEditor();
    fireEvent.change(threshold(1), { target: { value: "150" } });
    fireEvent.change(threshold(2), { target: { value: "-4" } });
    save();
    await waitFor(() =>
      expect(banner()).toHaveTextContent("2 champs à corriger"),
    );
    expect(threshold(1)).toHaveAttribute("aria-invalid", "true");
    expect(threshold(2)).toHaveAttribute("aria-invalid", "true");
  });

  /**
   * Le cas qui rendait le refus muet : le champ fautif est dans une entrée
   * que le volet de droite ne montre pas. Le refus l'ouvre.
   */
  it("ouvre l'entrée fautive quand ce n'est pas celle qu'on regarde", async () => {
    // L'échelle de départ porte le seuil hors plage plutôt qu'une saisie :
    // `useSearchParams` est figé par le mock, donc la seule façon d'ouvrir
    // Argent est de partir d'elle — et la plage de Bronze n'est alors plus
    // atteignable à l'écran.
    search = "entry=silver";
    const broken = structuredClone(ladder);
    broken[0].bands[0].threshold = 150;
    renderEditor(broken);
    expect(screen.getByRole("heading", { name: "Argent" })).toBeInTheDocument();
    replace.mockClear();
    save();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("entry=bronze"),
      ),
    );
  });

  it("refuse une entrée sans ligue ni nom, sur son sélecteur de ligue", async () => {
    renderEditor();
    fireEvent.change(league(), { target: { value: "" } });
    save();
    await waitFor(() =>
      expect(banner()).toHaveTextContent(
        "Choisis une ligue de base ou saisis un nom libre",
      ),
    );
    expect(league()).toHaveAttribute("aria-invalid", "true");
    expect(league()).toHaveClass("border-admin-danger-ink");
    expect(league()).toHaveFocus();
  });

  it("refuse un mouvement sans cible, sur la paire entière", async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText(/ligne 1 Ligue cible/), {
      target: { value: "" },
    });
    save();
    await waitFor(() =>
      expect(banner()).toHaveTextContent(
        "Mouvement et cible doivent être confirmés ensemble.",
      ),
    );
    const group = screen.getByRole("radiogroup", { name: /ligne 1 Mouvement/ });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveClass("border-admin-danger-ink");
  });

  it("enregistre sans rien signaler quand tout est bon", async () => {
    const request = renderEditor();
    fireEvent.change(threshold(1), { target: { value: "12" } });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  // Les marques suivent le refus, pas la saisie : Annuler les efface avec
  // les valeurs qu'elles visaient.
  it("efface les marques quand on revient aux valeurs enregistrées", async () => {
    renderEditor();
    fireEvent.change(threshold(1), { target: { value: "150" } });
    save();
    await waitFor(() =>
      expect(threshold(1)).toHaveAttribute("aria-invalid", "true"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    await waitFor(() =>
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(
        0,
      ),
    );
  });
});
