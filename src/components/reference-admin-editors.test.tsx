import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combatReferenceRows,
  defaultCombatGemSlotsBase,
  defaultCombatMergeCostBase,
  defaultCombatSkydustBase,
  defaultExpeditionDismantleBase,
  defaultExpeditionMergeCostBase,
  defaultExpeditionStarIncrements,
  expeditionReferenceRows,
} from "../lib/reference-equipment";
import { equipmentStarIncrement } from "../lib/equipment";
import {
  CombatIncrementsAdmin,
  CombatReferenceAdmin,
  CombatReferenceScreen,
  CombatSecondaryAdmin,
  ExpeditionIncrementsAdmin,
  ExpeditionReferenceAdmin,
  ExpeditionReferenceScreen,
  ExpeditionSecondaryAdmin,
} from "./reference-admin-editors";
import { renderWithIntl as render } from "../test/render-with-intl";

const combatSecondaryInitial = {
  mergeCost: defaultCombatMergeCostBase,
  gemSlots: defaultCombatGemSlotsBase,
  skydust: defaultCombatSkydustBase,
};
const expeditionSecondaryInitial = {
  mergeCost: defaultExpeditionMergeCostBase,
  dismantle: defaultExpeditionDismantleBase,
};

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

  it("Bloc35 5.5: gives the increments table a dedicated title, not a page-level sentence", () => {
    render(
      <ExpeditionIncrementsAdmin initial={defaultExpeditionStarIncrements} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Incréments par étoile des statistiques d’Équipements d’Expédition",
      }),
    ).toBeVisible();
  });

  // Bloc 75/C: mirrors the expedition increments test above exactly — Combat's
  // per-skill increments (previously hardcoded in equipment.ts) are now the
  // same 1-row-of-N-columns admin grid.
  it("Bloc75/C: edits and submits the 10 combat star increments as one row", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatIncrementsAdmin initial={equipmentStarIncrement} />,
    );
    expect(
      container.querySelector('input[aria-label="Ligne 1 Attaque"]'),
    ).toHaveValue(2);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Attaque"]')!,
      { target: { value: "4" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(1);
    expect(body[0].Attaque).toBe("4");
    expect(body[0].Vitesse).toBe(String(equipmentStarIncrement.Vitesse));
  });

  it("Bloc75/C: lays out the combat star increments as a field grid, not a wide table", () => {
    const { container } = render(
      <CombatIncrementsAdmin initial={equipmentStarIncrement} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(
      container.querySelectorAll(".reference-admin-grid-row"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".reference-admin-grid-field"),
    ).toHaveLength(10);
  });

  // Bloc 75/B: Terradust merge-cost and Terradust-at-dismantle now share 1
  // merged table (Fusion/Destruction rows) instead of 2 separate tables.
  it("Bloc75/B: edits and submits Expedition's merge-cost and dismantle rows as 1 merged table", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionSecondaryAdmin initial={expeditionSecondaryInitial} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(
      container.querySelector('input[aria-label="Ligne 1 Commun"]'),
    ).toHaveValue(600);
    expect(
      container.querySelector('input[aria-label="Ligne 2 Rare"]'),
    ).toHaveValue(0);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Commun"]')!,
      { target: { value: "700" } },
    );
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 2 Rare"]')!,
      { target: { value: "42" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(2);
    expect(body[0].Commun).toBe("700");
    expect(body[0].Légendaire).toBe(
      String(defaultExpeditionMergeCostBase.Légendaire),
    );
    expect(body[1].Rare).toBe("42");
    expect(body[1].Commun).toBe("0");
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

  // Bloc 75/A: Combat's Pouciel merge cost, gem slots and Pouciel-at-
  // destruction now share 1 merged table (Fusion/Gemmes/Destruction rows)
  // instead of 3 separate tables, one PUT saving all 3 quantities together.
  it("Bloc75/A: edits and submits Combat's Fusion/Gemmes/Destruction rows as 1 merged table", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatSecondaryAdmin initial={combatSecondaryInitial} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(
      container.querySelector('input[aria-label="Ligne 1 Commun"]'),
    ).toHaveValue(20);
    expect(
      container.querySelector('input[aria-label="Ligne 2 Épique"]'),
    ).toHaveValue(1);
    expect(
      container.querySelector('input[aria-label="Ligne 3 Commun"]'),
    ).toHaveValue(3);
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 1 Rare"]')!,
      { target: { value: "45" } },
    );
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 2 Épique"]')!,
      { target: { value: "2" } },
    );
    fireEvent.change(
      container.querySelector('input[aria-label="Ligne 3 Commun"]')!,
      { target: { value: "5" } },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(3);
    expect(body[0].Rare).toBe("45");
    expect(body[1].Épique).toBe("2");
    expect(body[2].Commun).toBe("5");
  });

  it("Bloc37/E: combines Combat's 3 tables under one top EditorActionBar, saved in a single action", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        secondaryInitial={combatSecondaryInitial}
        incrementsInitial={equipmentStarIncrement}
      />,
    );
    expect(container.querySelectorAll(".editor-action-bar")).toHaveLength(1);
    expect(container.querySelectorAll("button.primary-button")).toHaveLength(0);
    expect(screen.getByRole("link", { name: /Retour/ })).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );

    // Bloc 75/A+C: Fusion/Gemmes/Destruction (merged) and star increments
    // render before the main table now.
    const [secondary, increments, main] = Array.from(
      container.querySelectorAll(".editable-reference"),
    );
    fireEvent.change(
      main.querySelector('input[aria-label="Ligne 1 Nom du set"]')!,
      { target: { value: "Set modifié" } },
    );
    fireEvent.change(
      secondary.querySelector('input[aria-label="Ligne 3 Commun"]')!,
      { target: { value: "5" } },
    );
    fireEvent.change(
      increments.querySelector('input[aria-label="Ligne 1 Attaque"]')!,
      { target: { value: "4" } },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    // Bloc 37/E fix (Codex review): the secondary table saves before the
    // main table, since its endpoint reads that base and stamps it into
    // every row — so it must land first, not race it.
    expect(bodies[0][2].Commun).toBe("5");
    expect(bodies[1][0].Attaque).toBe("4");
    expect(bodies[2][0].set_name).toBe("Set modifié");
    expect(await screen.findByText("Référentiel enregistré.")).toBeVisible();
  });

  it("Bloc37/E fix: the Combat main table only saves after the secondary/increments tables have finished (no race on the stamped bases)", async () => {
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
        secondaryInitial={combatSecondaryInitial}
        incrementsInitial={equipmentStarIncrement}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    // Only the secondary + increments tables (the base tables) should have
    // been sent so far — the main table's request must wait for them to
    // resolve first.
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
        secondaryInitial={combatSecondaryInitial}
        incrementsInitial={equipmentStarIncrement}
      />,
    );
    // Bloc 41/D + 75/A: the merged secondary table is the first table
    // rendered.
    const [secondary] = Array.from(
      container.querySelectorAll(".editable-reference"),
    );
    fireEvent.change(
      secondary.querySelector('input[aria-label="Ligne 1 Commun"]')!,
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

  it("Bloc37/E: combines Expedition's 3 tables under one top EditorActionBar, saved in a single action", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionReferenceScreen
        initialRows={[...expeditionReferenceRows]}
        incrementsInitial={defaultExpeditionStarIncrements}
        secondaryInitial={expeditionSecondaryInitial}
      />,
    );
    expect(container.querySelectorAll(".editor-action-bar")).toHaveLength(1);
    expect(container.querySelectorAll("button.primary-button")).toHaveLength(0);
    expect(container.querySelectorAll(".editable-reference")).toHaveLength(3);

    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la page" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("Référentiel enregistré.")).toBeVisible();
  });

  it("Bloc41/D: renders the merged secondary table and increments before the main 180-row table", () => {
    const { container } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        secondaryInitial={combatSecondaryInitial}
        incrementsInitial={equipmentStarIncrement}
      />,
    );
    const tables = Array.from(
      container.querySelectorAll(".editable-reference"),
    );
    expect(tables).toHaveLength(3);
    const [secondary, increments, main] = tables;
    expect(secondary.querySelector("h2")?.textContent).toContain("Pouciel");
    expect(increments.querySelector("h2")?.textContent).toContain(
      "Incréments par étoile",
    );
    expect(main.querySelector("table")).not.toBeNull();
  });

  it("Bloc38/Q: widens Combat's secondary/increments and Expedition's increments/secondary inputs, never the main tables' narrow % columns", () => {
    const { container: combatContainer } = render(
      <CombatReferenceScreen
        initialRows={[...combatReferenceRows]}
        secondaryInitial={combatSecondaryInitial}
        incrementsInitial={equipmentStarIncrement}
      />,
    );
    const [combatSecondary, combatIncrements, combatMain] = Array.from(
      combatContainer.querySelectorAll(".editable-reference"),
    );
    expect(combatMain).not.toHaveClass("reference-admin-wide-inputs");
    expect(combatSecondary).toHaveClass("reference-admin-wide-inputs");
    expect(combatIncrements).toHaveClass("reference-admin-wide-inputs");

    const { container: expeditionContainer } = render(
      <ExpeditionReferenceScreen
        initialRows={[...expeditionReferenceRows]}
        incrementsInitial={defaultExpeditionStarIncrements}
        secondaryInitial={expeditionSecondaryInitial}
      />,
    );
    const [increments, secondary, expeditionMain] = Array.from(
      expeditionContainer.querySelectorAll(".editable-reference"),
    );
    expect(increments).toHaveClass("reference-admin-wide-inputs");
    expect(secondary).toHaveClass("reference-admin-wide-inputs");
    expect(expeditionMain).not.toHaveClass("reference-admin-wide-inputs");
  });
});
