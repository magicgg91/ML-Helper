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
import { AdminRankingEditor } from "./admin-ranking-editor";

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

/**
 * Bloc 137 : l'écran de l'outil Classement, et lui seul, règle le classement.
 *
 * Le Bloc 108 avait mis l'échelle entière sous cet écran, CRUD compris ; le
 * Bloc 135 l'avait entièrement déplacée dans Configuration, plages de fin de
 * saison comprises. Les deux fois la couture était au mauvais endroit, et la
 * seconde donnait ce que le porteur de projet a trouvé : une création de ligue
 * là où l'on venait éditer un classement.
 *
 * Ici, donc : des boutons pour les échelons existants, les plages de celui qu'on
 * choisit, et **rien** pour en créer, supprimer ou renommer un. Les cas de
 * validation des plages viennent de `admin-leagues-panel.test.tsx`, où ils ne
 * sont plus à leur place — la mécanique du Bloc 131/C est la même, sur l'écran
 * qui porte maintenant ces champs.
 */
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
    // Un échelon préparé mais pas publié : on doit pouvoir régler son classement
    // avant de l'allumer, d'où sa présence parmi les boutons.
    active: false,
    bands: [],
  },
];

function renderEditor(initial: LeagueLadder = ladder) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(
    <AdminRankingEditor
      initialLadder={structuredClone(initial)}
      backHref="/admin/tools"
      backLabel="Outils"
      title="Classement"
    />,
  );
  return request;
}

const rungs = () => screen.getByRole("group", { name: "Ligue ou division" });
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
const threshold = (row: number) =>
  screen.getByLabelText(new RegExp(`ligne ${row} Seuil`));
const banner = () => screen.getByRole("status");

describe("Bloc 137: the Classement tool's own screen", () => {
  it("offers one button per existing rung, hidden ones included", () => {
    renderEditor();
    const buttons = within(rungs()).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Bronze",
      "Argentmasquée",
    ]);
    // Le premier est celui qu'on regarde.
    expect(buttons[0]).toHaveAttribute("aria-current", "true");
    expect(buttons[1]).not.toHaveAttribute("aria-current");
  });

  it("carries nothing that creates, deletes or renames a rung", () => {
    renderEditor();
    // C'est le constat du porteur de projet, retourné en test : cet écran ne
    // doit porter aucune de ces trois choses. Une seule qui revient le fait
    // tomber, quel que soit le bouton par lequel elle revient.
    for (const name of [
      /Ajouter une ligue/,
      /Ajouter une division/,
      /Supprimer l’entrée/,
      /^Monter/,
      /^Descendre/,
    ])
      expect(screen.queryByRole("button", { name }), String(name)).toBeNull();
    expect(screen.queryByLabelText(/nom libre/i)).toBeNull();
    expect(screen.queryByLabelText(/ligue de base/i)).toBeNull();
    expect(screen.queryByLabelText(/active publiquement/i)).toBeNull();
  });

  it("says where creating or renaming one is done", () => {
    renderEditor();
    expect(
      screen.getByRole("link", { name: "Ouvrir Ligues et divisions" }),
    ).toHaveAttribute("href", "/admin/config#ligues-divisions");
  });

  it("shows the bands of the rung the URL names", () => {
    search = "rung=silver";
    renderEditor();
    expect(within(rungs()).getAllByRole("button")[1]).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("Aucune plage confirmée.")).toBeInTheDocument();
  });

  it("puts the rung you pick in the URL", () => {
    renderEditor();
    fireEvent.click(within(rungs()).getAllByRole("button")[1]);
    expect(replace).toHaveBeenCalledWith(
      expect.stringContaining("rung=silver"),
      expect.anything(),
    );
  });

  it("adds and removes a band on the rung on screen", () => {
    renderEditor();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter une plage" }));
    expect(screen.getAllByRole("radiogroup")).toHaveLength(3);
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer Plage 3 de Bronze" }),
    );
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
  });

  it("sets a band's movement from three buttons, and clears it on a second click", () => {
    renderEditor();
    const group = screen.getAllByRole("radiogroup")[0];
    const promotion = within(group).getByRole("radio", { name: "Montée" });
    expect(promotion).toHaveAttribute("aria-checked", "true");
    fireEvent.click(promotion);
    // Une plage sans mouvement confirmé est un état réel.
    expect(promotion).toHaveAttribute("aria-checked", "false");
    fireEvent.click(within(group).getByRole("radio", { name: "Descente" }));
    expect(
      within(group).getByRole("radio", { name: "Descente" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("sends the bands alone, keyed by rung, and never the ladder's identity", async () => {
    const request = renderEditor();
    fireEvent.change(threshold(1), { target: { value: "12" } });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][0]).toBe("/api/admin/tools/ranking");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    // La forme est ce que la route fusionne : des plages par identifiant. Rien
    // de l'identité ne part d'ici — c'est ce qui empêche cet écran de défaire un
    // renommage fait dans Configuration entre-temps.
    expect(Object.keys(body)).toEqual(["bands"]);
    expect(Object.keys(body.bands)).toEqual(["bronze", "silver"]);
    expect(body.bands.bronze[0]).toEqual({
      threshold: 12,
      movement: "promotion",
      target: "silver",
      rewards: [{ type: "sapphires", quantity: 300 }],
    });
    expect(body.bands.silver).toEqual([]);
  });
});

/**
 * Bloc 131/C, suivi jusqu'ici : un refus dit où il coince.
 *
 * Ces cas vivaient sur le panneau de Configuration tant qu'il portait les
 * plages. La règle n'a pas changé — le bandeau nomme, le champ est entouré, le
 * curseur y va, et l'échelon fautif s'ouvre même si ce n'est pas celui qu'on
 * regarde.
 */
describe("Bloc 131/C — dire où le classement coince", () => {
  const describedBy = (field: HTMLElement) =>
    (field.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

  it("n'envoie rien et nomme l'échelon, la plage et le champ", async () => {
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
    // La raison est rattachée au champ, pas seulement posée à côté.
    expect(describedBy(field)).toContain("Entre 0 et 100 requis.");
  });

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

  it("ouvre l'échelon fautif quand ce n'est pas celui qu'on regarde", async () => {
    // L'échelle de départ porte le seuil hors plage : `useSearchParams` est figé
    // par le mock, donc la seule façon d'ouvrir Argent est de partir d'elle — et
    // la plage de Bronze n'est alors plus atteignable à l'écran.
    search = "rung=silver";
    const broken = structuredClone(ladder);
    broken[0].bands[0].threshold = 150;
    renderEditor(broken);
    replace.mockClear();
    save();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("rung=bronze"),
        expect.anything(),
      ),
    );
  });

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

describe("Bloc 137: an empty ladder", () => {
  it("says so, and points at the screen that fills it", () => {
    renderEditor([]);
    expect(
      screen.getByText("Aucune ligue ni division n’existe encore."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ouvrir Ligues et divisions" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Ligue ou division" }),
    ).toBeNull();
  });
});
