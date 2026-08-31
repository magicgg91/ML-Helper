import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumablesReferenceScreen } from "./consumables-admin-editor";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableRow } from "../lib/consumables";

const rowA: ConsumableRow = {
  image: "/consumables/a.webp",
  name_fr: "Objet A",
  name_en: "Item A",
  description_fr: "Description A",
  description_en: "Description A EN",
  cost: "100",
  category: "equipment",
};
const rowB: ConsumableRow = {
  image: "/consumables/b.webp",
  name_fr: "Objet B",
  name_en: "Item B",
  description_fr: "Description B",
  description_en: "Description B EN",
  cost: "",
  category: "inventory",
};
const introInitial = {
  fr: "## Intro FR",
  en: "## Intro EN",
  de: "",
  es: "",
  tr: "",
};

function renderScreen() {
  return render(
    <ConsumablesReferenceScreen
      initialRows={[rowA, rowB]}
      introInitial={introInitial}
    />,
  );
}

function saveButton() {
  return screen.getByRole("button", { name: "Enregistrer toute la page" });
}

describe("ConsumablesReferenceScreen", () => {
  afterEach(cleanup);
  beforeEach(() => vi.restoreAllMocks());

  it("shows one back link, one combined save button and the two starting rows in order", () => {
    renderScreen();
    expect(screen.getAllByRole("link", { name: "← Retour" })).toHaveLength(1);
    expect(saveButton()).toBeInTheDocument();
    expect(screen.getByLabelText("Ligne 1 Nom (FR)")).toHaveValue("Objet A");
    expect(screen.getByLabelText("Ligne 2 Nom (FR)")).toHaveValue("Objet B");
  });

  it("adds a free-form empty row at the end", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un objet" }));
    expect(screen.getByLabelText("Ligne 3 Nom (FR)")).toHaveValue("");
    expect(screen.getByLabelText("Ligne 3 Coût (Saphirs)")).toHaveValue(null);
  });

  it("removes a row by its own row-scoped button", () => {
    renderScreen();
    fireEvent.click(screen.getAllByRole("button", { name: "Supprimer" })[0]);
    expect(screen.queryByLabelText("Ligne 2 Nom (FR)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ligne 1 Nom (FR)")).toHaveValue("Objet B");
  });

  // Bloc 42/I: this table was reordered in Bloc 41 and its row-scoped
  // actions have no other stable identifier — a data-testid keyed on row
  // position survives future redesigns that a text/role query wouldn't.
  it("Bloc42/I: gives each row and its move/remove actions a stable, row-scoped data-testid", () => {
    renderScreen();
    expect(
      within(screen.getByTestId("row-0")).getByLabelText("Ligne 1 Nom (FR)"),
    ).toHaveValue("Objet A");
    expect(
      within(screen.getByTestId("row-1")).getByLabelText("Ligne 2 Nom (FR)"),
    ).toHaveValue("Objet B");
    expect(screen.getByTestId("move-up-0")).toBeDisabled();
    expect(screen.getByTestId("move-down-1")).toBeDisabled();
    expect(screen.getByTestId("remove-row-0")).toBeInTheDocument();
  });

  it("moves a row down/up by exactly 1 position, disabled at the boundaries", () => {
    renderScreen();
    const moveUpButtons = screen.getAllByRole("button", { name: "Monter" });
    const moveDownButtons = screen.getAllByRole("button", {
      name: "Descendre",
    });
    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveDownButtons[1]).toBeDisabled();

    fireEvent.click(moveDownButtons[0]);
    expect(screen.getByLabelText("Ligne 1 Nom (FR)")).toHaveValue("Objet B");
    expect(screen.getByLabelText("Ligne 2 Nom (FR)")).toHaveValue("Objet A");
  });

  // Bloc 46/B: the move buttons render an arrow icon, not the "Monter"/
  // "Descendre" text label — aria-label (used above for the accessible
  // name/functional queries) keeps carrying the text for a11y.
  it("Bloc46/B: renders the move buttons as icons, with no visible text label", () => {
    renderScreen();
    const moveUpButtons = screen.getAllByRole("button", { name: "Monter" });
    const moveDownButtons = screen.getAllByRole("button", {
      name: "Descendre",
    });
    for (const button of [...moveUpButtons, ...moveDownButtons]) {
      expect(button).toHaveTextContent("");
      expect(button.querySelector("svg")).toBeInTheDocument();
    }
  });

  // Bloc 46/C: a select per row lets the admin assign one of the 4
  // categories, available for both existing and newly-added rows.
  it("Bloc46/C: offers a functional category select for each row, defaulting new rows to Inventaire", () => {
    renderScreen();
    const categoryA = screen.getByLabelText("Ligne 1 Catégorie");
    const categoryB = screen.getByLabelText("Ligne 2 Catégorie");
    expect(categoryA).toHaveValue("equipment");
    expect(categoryB).toHaveValue("inventory");

    fireEvent.change(categoryA, { target: { value: "expedition" } });
    expect(categoryA).toHaveValue("expedition");

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un objet" }));
    expect(screen.getByLabelText("Ligne 3 Catégorie")).toHaveValue("inventory");
  });

  // Bloc 44 review: a single action persists both sections together — no
  // separate button per section that could be clicked while leaving the
  // other one's edits unsaved.
  it("saves both the intro (PATCH) and the rows (PUT) from the one save button", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    renderScreen();
    fireEvent.change(screen.getByLabelText("Introduction (markdown)"), {
      target: { value: "## Nouvelle intro" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const calls = fetchMock.mock.calls;
    const introCall = calls.find(
      ([url]) => url === "/api/admin/content/consumables-intro",
    );
    const rowsCall = calls.find(
      ([url]) => url === "/api/admin/guides/references/consumables",
    );
    expect(introCall?.[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(introCall?.[1]?.body))).toEqual({
      content: { ...introInitial, fr: "## Nouvelle intro" },
    });
    expect(rowsCall?.[1]?.method).toBe("PUT");
    expect(JSON.parse(String(rowsCall?.[1]?.body))).toEqual([rowA, rowB]);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Référentiel enregistré.",
    );
  });

  it("blocks saving entirely when a required field is emptied, without calling fetch", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderScreen();
    fireEvent.change(screen.getByLabelText("Ligne 1 Nom (FR)"), {
      target: { value: "" },
    });
    fireEvent.click(saveButton());
    expect(
      screen.getByText("Corrige les champs signalés avant l’enregistrement."),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Bloc 44 review: a partial failure (one section saved, the other
  // didn't) is reported explicitly, distinct from the other section's
  // success — never a generic "saved" that hides the failed half.
  it("reports a partial failure explicitly instead of a generic success", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) =>
        url === "/api/admin/content/consumables-intro"
          ? new Response(null, { status: 500 })
          : new Response(null, { status: 200 }),
      );
    renderScreen();
    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Introduction non enregistrée (les objets ont bien été enregistrés).",
    );
  });

  it("reports total failure when both requests fail", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    renderScreen();
    fireEvent.click(saveButton());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Impossible de joindre le serveur.",
    );
  });
});
