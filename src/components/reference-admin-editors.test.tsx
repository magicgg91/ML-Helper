import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combatReferenceRows,
  defaultCombatGemSlotsBase,
  defaultCombatSkydustBase,
  defaultExpeditionDismantleBase,
  defaultExpeditionMergeCostBase,
  defaultExpeditionStarIncrements,
  expeditionReferenceRows,
} from "../lib/reference-equipment";
import {
  CombatGemSlotsAdmin,
  CombatReferenceAdmin,
  CombatReferenceScreen,
  CombatSkydustAdmin,
  ExpeditionDismantleAdmin,
  ExpeditionIncrementsAdmin,
  ExpeditionMergeCostAdmin,
  ExpeditionReferenceAdmin,
  ExpeditionReferenceScreen,
} from "./reference-admin-editors";
import { renderWithIntl as render } from "../test/render-with-intl";

describe("complete lookup table administration", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it("edits and submits known combat rows, not only missing rows", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatReferenceAdmin initialRows={[...combatReferenceRows]} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(180);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Nom du set"]')!,
      {
        target: { value: "Set confirmé modifié" },
      },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(180);
    expect(body[0].set_name).toBe("Set confirmé modifié");
  });
  it("exposes every expedition row with structured dropdowns", () => {
    const { unmount } = render(
      <ExpeditionReferenceAdmin initialRows={[...expeditionReferenceRows]} />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(121);
    expect(
      screen.getByLabelText("Expédition ligne 1 Valeur type (%)"),
    ).toHaveValue(5.4);
    expect(
      screen.getAllByRole("combobox", { name: "Rareté" })[0],
    ).toBeVisible();
    unmount();
  });
  it("edits and submits the 10 expedition star increments as one row", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionIncrementsAdmin initial={defaultExpeditionStarIncrements} />,
    );
    expect(
      container.querySelector('input[aria-label="Ligne 1 Or"]'),
    ).toHaveValue(0.3);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Or"]')!,
      {
        target: { value: "0.5" },
      },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(1);
    expect(body[0].Or).toBe("0.5");
    expect(body[0].Chance).toBe(String(defaultExpeditionStarIncrements.Chance));
  });

  it("Bloc35 5.1: lays out the expedition star increments as a field grid, not a wide table", () => {
    const { container } = render(
      <ExpeditionIncrementsAdmin initial={defaultExpeditionStarIncrements} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(
      container.querySelectorAll(".reference-admin-grid-row"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".reference-admin-grid-field"),
    ).toHaveLength(10);
  });

  it("Bloc35 5.5: gives the increments and merge-cost tables a dedicated title, not a page-level sentence", () => {
    render(
      <ExpeditionIncrementsAdmin initial={defaultExpeditionStarIncrements} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Incréments par étoile des statistiques d’Équipements d’Expédition",
      }),
    ).toBeVisible();
  });

  it("edits and submits the 5 Terradust merge-cost constants as one row", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionMergeCostAdmin initial={defaultExpeditionMergeCostBase} />,
    );
    // Bloc 40/B: switched to the grid layout (no more <table>) — a fixed
    // 5-col table always overflowed the page and forced horizontal scroll.
    expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(
      container.querySelectorAll(".reference-admin-grid-row"),
    ).toHaveLength(1);
    expect(
      container.querySelector('input[aria-label="Ligne 1 Commun"]'),
    ).toHaveValue(600);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Commun"]')!,
      { target: { value: "700" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(1);
    expect(body[0].Commun).toBe("700");
    expect(body[0].Légendaire).toBe(
      String(defaultExpeditionMergeCostBase.Légendaire),
    );
  });

  it("Bloc35 6.1: no longer shows Pouciel/Gemmes as per-row columns on the main combat table", () => {
    render(<CombatReferenceAdmin initialRows={[...combatReferenceRows]} />);
    expect(screen.queryByText("Pouciel")).not.toBeInTheDocument();
    expect(screen.queryByText("Gemmes")).not.toBeInTheDocument();
  });

  it("Bloc35 6.2: orders the combat table's columns Famille, Rareté, Nom du set, Emplacement, then skills", () => {
    render(<CombatReferenceAdmin initialRows={[...combatReferenceRows]} />);
    const headers = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(headers.slice(0, 5)).toEqual([
      "Famille",
      "Rareté",
      "Nom du set",
      "Type d’emplacement",
      "Nom d’emplacement",
    ]);
  });

  it("Bloc35 6.3: narrows the Valeur 1-4 columns on the combat table", () => {
    const { container } = render(
      <CombatReferenceAdmin initialRows={[...combatReferenceRows]} />,
    );
    const valueCell = container
      .querySelector('input[aria-label="Ligne 1 Valeur 1 (%)"]')!
      .closest("td");
    expect(valueCell).toHaveClass("reference-admin-narrow");
    const setNameCell = container
      .querySelector('input[aria-label="Ligne 1 Nom du set"]')!
      .closest("td");
    expect(setNameCell).not.toHaveClass("reference-admin-narrow");
  });

  it("Bloc37/D: sizes the combat filter row's selects to their content, not .reference-filters (the public page's row)", () => {
    const { container } = render(
      <CombatReferenceAdmin initialRows={[...combatReferenceRows]} />,
    );
    const filters = container.querySelector(".reference-admin-filters")!;
    expect(filters).toBeInTheDocument();
    expect(container.querySelector(".reference-filters")).toBeNull();
    const familySelect = screen.getByRole("combobox", { name: "Famille" });
    expect(familySelect.closest(".reference-admin-filters")).toBe(filters);
  });

  it("Bloc35 5.4: orders the expedition table's columns Famille, Rareté, Nom du set, Emplacement, then stats", () => {
    render(
      <ExpeditionReferenceAdmin initialRows={[...expeditionReferenceRows]} />,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent);
    expect(headers).toEqual([
      "Famille",
      "Rareté",
      "Nom du set",
      "Emplacement",
      "Valeur type (%)",
      "Stat secondaire",
      "Valeur secondaire (%)",
    ]);
  });

  it("Bloc37/B: sizes the expedition filter row's selects to their content too", () => {
    const { container } = render(
      <ExpeditionReferenceAdmin initialRows={[...expeditionReferenceRows]} />,
    );
    expect(
      container.querySelector(".reference-admin-filters"),
    ).toBeInTheDocument();
    expect(container.querySelector(".reference-filters")).toBeNull();
  });

  it("Bloc37/A: narrows the expedition table's percentage columns too (previously left at full width)", () => {
    const { container } = render(
      <ExpeditionReferenceAdmin initialRows={[...expeditionReferenceRows]} />,
    );
    const typeValueCell = container
      .querySelector('input[aria-label="Expédition ligne 1 Valeur type (%)"]')!
      .closest("td");
    expect(typeValueCell).toHaveClass("reference-admin-narrow");
    const setNameCell = container
      .querySelector('input[aria-label="Expédition ligne 1 Nom du set"]')!
      .closest("td");
    expect(setNameCell).not.toHaveClass("reference-admin-narrow");
  });

  it("Bloc35 6.1: edits and submits Combat's Pouciel-per-rarity as a dedicated admin table", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatSkydustAdmin initial={defaultCombatSkydustBase} />,
    );
    expect(
      container.querySelector('input[aria-label="Ligne 1 Commun"]'),
    ).toHaveValue(3);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Commun"]')!,
      { target: { value: "5" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body[0].Commun).toBe("5");
    expect(body[0].Légendaire).toBe(
      String(defaultCombatSkydustBase.Légendaire),
    );
  });

  it("Bloc35 6.1: edits and submits Combat's gem-slots-per-rarity as a dedicated admin table", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatGemSlotsAdmin initial={defaultCombatGemSlotsBase} />,
    );
    expect(
      container.querySelector('input[aria-label="Ligne 1 Épique"]'),
    ).toHaveValue(1);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Épique"]')!,
      { target: { value: "2" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body[0].Épique).toBe("2");
  });

  it("Bloc35 5.2: edits and submits Expedition's Terradust-on-dismantle per rarity, defaulting to 0", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionDismantleAdmin initial={defaultExpeditionDismantleBase} />,
    );
    // Bloc 40/B: grid layout here too, same reasoning as merge-cost above.
    expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(
      container.querySelectorAll(".reference-admin-grid-row"),
    ).toHaveLength(1);
    expect(
      container.querySelector('input[aria-label="Ligne 1 Rare"]'),
    ).toHaveValue(0);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Rare"]')!,
      { target: { value: "42" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body[0].Rare).toBe("42");
    expect(body[0].Commun).toBe("0");
  });

  it("Bloc37/E: combines Combat's 3 tables under one top EditorActionBar, saved in a single action", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        skydustInitial={defaultCombatSkydustBase}
        gemSlotsInitial={defaultCombatGemSlotsBase}
      />,
    );
    expect(container.querySelectorAll(".editor-action-bar")).toHaveLength(1);
    expect(container.querySelectorAll("button.primary-button")).toHaveLength(
      0,
    );
    expect(
      screen.getByRole("link", { name: /Retour/ }),
    ).toHaveAttribute("href", "/admin/guides");

    // Bloc 41/D: Pouciel and gem-slots render before the main table now.
    const [skydust, gemSlots, main] = Array.from(
      container.querySelectorAll(".editable-reference"),
    );
    fireEvent.change(
      main.querySelector('input[aria-label="Ligne 1 Nom du set"]')!,
      { target: { value: "Set modifié" } },
    );
    fireEvent.change(
      skydust.querySelector('input[aria-label="Ligne 1 Commun"]')!,
      { target: { value: "5" } },
    );
    fireEvent.change(
      gemSlots.querySelector('input[aria-label="Ligne 1 Épique"]')!,
      { target: { value: "2" } },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    // Bloc 37/E fix (Codex review): Pouciel and gem-slots save before the
    // main table, since its endpoint reads those bases and stamps them
    // into every row — so they must land first, not race it.
    expect(bodies[0][0].Commun).toBe("5");
    expect(bodies[1][0].Épique).toBe("2");
    expect(bodies[2][0].set_name).toBe("Set modifié");
    expect(await screen.findByText("Référentiel enregistré.")).toBeVisible();
  });

  it("Bloc37/E fix: the Combat main table only saves after Pouciel and gem-slots have finished (no race on the stamped bases)", async () => {
    const resolvers: Array<() => void> = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(() => resolve(new Response("{}", { status: 200 })));
        }),
    );
    render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        skydustInitial={defaultCombatSkydustBase}
        gemSlotsInitial={defaultCombatGemSlotsBase}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    // Only Pouciel + gem-slots (the base tables) should have been sent so
    // far — the main table's request must wait for them to resolve first.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolvers.forEach((resolve) => resolve());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    resolvers[2]();
    expect(await screen.findByText("Référentiel enregistré.")).toBeVisible();
  }, 15000); // above the 5s default — under full-suite parallel load this
  // render-heavy test has been observed to occasionally exceed it, even
  // though the awaited work itself finishes in well under a second.

  it("Bloc37/E: a validation error in any Combat table blocks the whole combined save", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { container } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        skydustInitial={defaultCombatSkydustBase}
        gemSlotsInitial={defaultCombatGemSlotsBase}
      />,
    );
    // Bloc 41/D: Pouciel (skydust) is now the first table rendered.
    const [skydust] = Array.from(
      container.querySelectorAll(".editable-reference"),
    );
    fireEvent.change(
      skydust.querySelector('input[aria-label="Ligne 1 Commun"]')!,
      { target: { value: "" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    expect(
      await screen.findByText(
        "Corrige les champs signalés avant l’enregistrement.",
      ),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Bloc37/E: combines Expedition's 4 tables under one top EditorActionBar, saved in a single action", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionReferenceScreen
        initialRows={[...expeditionReferenceRows]}
        incrementsInitial={defaultExpeditionStarIncrements}
        mergeCostInitial={defaultExpeditionMergeCostBase}
        dismantleInitial={defaultExpeditionDismantleBase}
      />,
    );
    expect(container.querySelectorAll(".editor-action-bar")).toHaveLength(1);
    expect(container.querySelectorAll("button.primary-button")).toHaveLength(
      0,
    );
    expect(container.querySelectorAll(".editable-reference")).toHaveLength(4);

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(await screen.findByText("Référentiel enregistré.")).toBeVisible();
  });

  it("Bloc41/D: renders Pouciel and gem-slots before the main 180-row table", () => {
    const { container } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        skydustInitial={defaultCombatSkydustBase}
        gemSlotsInitial={defaultCombatGemSlotsBase}
      />,
    );
    const tables = Array.from(
      container.querySelectorAll(".editable-reference"),
    );
    expect(tables).toHaveLength(3);
    const [skydust, gemSlots, main] = tables;
    expect(skydust.querySelector("p")?.textContent).toContain(
      "Pouciel à la destruction",
    );
    expect(gemSlots.querySelector("p")?.textContent).toContain(
      "Emplacements de gemmes",
    );
    expect(main.querySelector("table")).not.toBeNull();
  });

  it("Bloc38/Q: widens Combat's Pouciel/gem-slots and Expedition's increments/merge-cost/dismantle inputs, never the main tables' narrow % columns", () => {
    const { container: combatContainer } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        skydustInitial={defaultCombatSkydustBase}
        gemSlotsInitial={defaultCombatGemSlotsBase}
      />,
    );
    // Bloc 41/D: Pouciel and gem-slots render before the main table now.
    const [skydust, gemSlots, combatMain] = Array.from(
      combatContainer.querySelectorAll(".editable-reference"),
    );
    expect(combatMain).not.toHaveClass("reference-admin-wide-inputs");
    expect(skydust).toHaveClass("reference-admin-wide-inputs");
    expect(gemSlots).toHaveClass("reference-admin-wide-inputs");

    const { container: expeditionContainer } = render(
      <ExpeditionReferenceScreen
        initialRows={[...expeditionReferenceRows]}
        incrementsInitial={defaultExpeditionStarIncrements}
        mergeCostInitial={defaultExpeditionMergeCostBase}
        dismantleInitial={defaultExpeditionDismantleBase}
      />,
    );
    const [increments, mergeCost, dismantle, expeditionMain] = Array.from(
      expeditionContainer.querySelectorAll(".editable-reference"),
    );
    expect(increments).toHaveClass("reference-admin-wide-inputs");
    expect(mergeCost).toHaveClass("reference-admin-wide-inputs");
    expect(dismantle).toHaveClass("reference-admin-wide-inputs");
    expect(expeditionMain).not.toHaveClass("reference-admin-wide-inputs");
  });
});
