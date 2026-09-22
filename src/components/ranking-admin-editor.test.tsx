import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultRankingLadder } from "../lib/ranking";
import { RankingAdminEditor } from "./ranking-admin-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RankingAdminEditor", () => {
  it("edits rows via named selects instead of a free-form target/reward string", () => {
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    expect(
      screen.queryByRole("textbox", { name: "Configuration Ranking" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Argent ligne 1 Mouvement")).toHaveValue(
      "promotion",
    );
    expect(screen.getByLabelText("Argent ligne 1 Ligue cible")).toHaveValue(
      "gold",
    );
    expect(screen.getByLabelText("Argent ligne 1 Saphirs")).toHaveValue(100);
    expect(screen.getByLabelText("Argent ligne 1 Speedups")).toHaveValue(7);
    expect(screen.getByLabelText("Argent ligne 1 Gemmes")).toHaveValue(6);
  });

  it("leaves an unconfirmed row's movement/league as the not-confirmed option", () => {
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    expect(screen.getByLabelText("Platine ligne 1 Mouvement")).toHaveValue("");
    expect(screen.getByLabelText("Platine ligne 1 Ligue cible")).toHaveValue(
      "",
    );
  });

  it("saves a structured payload with typed rewards", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.change(screen.getByLabelText("Diamant ligne 1 Gemmes"), {
      target: { value: "9" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    // Bloc 108/A: the payload is the ordered ladder, so an entry is found by
    // its id rather than by a fixed key on an object of six.
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const diamond = payload.find(
      (entry: { id: string }) => entry.id === "diamond",
    );
    expect(diamond.bands[0]).toEqual({
      threshold: 1,
      movement: "promotion",
      target: "legend",
      rewards: [{ type: "gems", quantity: 9 }],
    });
    // Bloc 108/B: position travels with the entry, and it is its index in the
    // list the admin sees — Diamant is the 5th rung of the shipped six.
    expect(diamond.position).toBe(4);
    expect(diamond.active).toBe(true);
  });

  it("shows field validation instead of failing silently", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.change(screen.getByLabelText("Argent ligne 1 Seuil (%)"), {
      target: { value: "101" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(screen.getByText("Entre 0 et 100 requis.")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Corrige les champs signalés",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a movement/league pairing error distinctly from the threshold error", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.change(screen.getByLabelText("Platine ligne 1 Mouvement"), {
      target: { value: "promotion" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(
      screen.getAllByText(
        "Mouvement et cible doivent être confirmés ensemble.",
      ),
    ).toHaveLength(2);
    expect(
      screen.queryByText("Entre 0 et 100 requis."),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Bloc35 9.1: narrows the numeric value columns to what they actually contain", () => {
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    expect(
      screen.getByLabelText("Argent ligne 1 Seuil (%)").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Saphirs").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Speedups").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Gemmes").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Mouvement").closest("td"),
    ).not.toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Ligue cible").closest("td"),
    ).not.toHaveClass("reference-admin-narrow");
  });

  it("rejects a fractional reward quantity", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.change(screen.getByLabelText("Argent ligne 1 Gemmes"), {
      target: { value: "1.5" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(screen.getByText("Nombre entier requis.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// Bloc 108/A+B+G: the entries themselves are now editable — added, renamed,
// reordered, switched on and off, removed — where before there were exactly
// six, forever.
describe("Bloc 108/A: the ladder entries are editable", () => {
  const entryHeadings = () =>
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

  it("starts from the six shipped leagues, in game order", () => {
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    expect(entryHeadings()).toEqual([
      "Bronze",
      "Argent",
      "Or",
      "Platine",
      "Diamant",
      "Légende",
    ]);
  });

  it("adds an entry, names it from a league and a division, and removes it", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une ligue ou une division" }),
    );
    expect(entryHeadings()).toHaveLength(7);
    expect(entryHeadings().at(-1)).toBe("Entrée sans nom");

    // Renaming: pick a base league and a division, and the heading follows —
    // the name is built from translated parts, not typed in one language.
    fireEvent.change(
      screen.getByLabelText("Entrée sans nom (rang 7) ligue de base"),
      { target: { value: "gold" } },
    );
    fireEvent.change(screen.getByLabelText("Or (rang 7) division"), {
      target: { value: "1" },
    });
    expect(entryHeadings().at(-1)).toBe("Or 1");

    fireEvent.click(screen.getByRole("button", { name: "Supprimer Or 1" }));
    expect(entryHeadings()).toHaveLength(6);
  });

  it("offers every entry as a target, including one just created", () => {
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    const target = screen.getByLabelText("Argent ligne 1 Ligue cible");
    expect(
      [...target.querySelectorAll("option")].map((o) => o.textContent),
    ).toEqual([
      "Non confirmé",
      "Bronze",
      "Argent",
      "Or",
      "Platine",
      "Diamant",
      "Légende",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une ligue ou une division" }),
    );
    expect(
      [
        ...screen
          .getByLabelText("Argent ligne 1 Ligue cible")
          .querySelectorAll("option"),
      ].map((o) => o.textContent),
    ).toContain("Entrée sans nom");
  });

  it("Bloc108/B: reorders entries, and the saved positions follow", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.click(screen.getByRole("button", { name: "Monter Argent" }));
    expect(entryHeadings().slice(0, 2)).toEqual(["Argent", "Bronze"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(
      payload.map((entry: { id: string }) => entry.id).slice(0, 2),
    ).toEqual(["silver", "bronze"]);
    expect(payload[0].position).toBe(0);
    expect(payload[1].position).toBe(1);
  });

  it("Bloc108/G: saves an entry's active flag as the admin left it", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    const toggle = screen.getByLabelText(
      "Platine (rang 4) active publiquement",
    );
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const platinum = payload.find(
      (entry: { id: string }) => entry.id === "platinum",
    );
    expect(platinum.active).toBe(false);
    // Its bands are untouched: deactivating hides an entry, it never empties it.
    expect(platinum.bands).toHaveLength(5);
  });

  it("refuses to save an entry that could not be named in any language", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialLadder={defaultRankingLadder} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une ligue ou une division" }),
    );
    // The new entry starts with neither a base league nor a name.
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(
      screen.getByText(
        "Choisis une ligue de base ou saisis un nom libre (FR ou EN).",
      ),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
