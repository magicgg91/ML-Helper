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
import type { ConsumableCatalog } from "../lib/consumables";

const rowA = {
  image: "/consumables/a.webp",
  name_fr: "Objet A",
  name_en: "Item A",
  description_fr: "Description A",
  description_en: "Description A EN",
  cost: "100",
};
const rowB = {
  image: "/consumables/b.webp",
  name_fr: "Objet B",
  name_en: "Item B",
  description_fr: "Description B",
  description_en: "Description B EN",
  cost: "",
};
const introInitial = {
  fr: "## Intro FR",
  en: "## Intro EN",
  de: "",
  es: "",
  tr: "",
};

function initialCatalog(): ConsumableCatalog {
  return {
    advisors: [],
    equipment: [rowA],
    expedition: [],
    inventory: [rowB],
  };
}

function renderScreen() {
  return render(
    <ConsumablesReferenceScreen
      initialCatalog={initialCatalog()}
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

  it("shows one back link, one combined save button, and 4 category tables", () => {
    renderScreen();
    expect(screen.getAllByRole("link", { name: "← Retour" })).toHaveLength(1);
    expect(saveButton()).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Conseillers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Équipement" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Expédition" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Inventaire" }),
    ).toBeInTheDocument();
  });

  // Bloc 48/A: regression fix — the locale selector already driving the
  // intro markdown zone must also drive the items table columns, showing
  // only 2 text columns (Nom + Description) in the active language at a
  // time, never all 4 (FR+EN name, FR+EN description) simultaneously.
  it("Bloc48/A: shows only Nom+Description in French by default, not all 4 language columns", () => {
    renderScreen();
    expect(screen.getByLabelText("Équipement — ligne 1 Nom")).toHaveValue(
      "Objet A",
    );
    expect(
      screen.getByLabelText("Équipement — ligne 1 Description"),
    ).toHaveValue("Description A");
    expect(screen.queryByText("Nom (FR)")).not.toBeInTheDocument();
    expect(screen.queryByText("Nom (EN)")).not.toBeInTheDocument();
    expect(screen.queryByText("Description (FR)")).not.toBeInTheDocument();
    expect(screen.queryByText("Description (EN)")).not.toBeInTheDocument();
    // Only the equipment and inventory tables have rows (and therefore a
    // rendered header) in this fixture — advisors/expedition start empty.
    expect(screen.getAllByText("Nom")).toHaveLength(2);
    expect(screen.getAllByText("Description")).toHaveLength(2);
  });

  // Bloc 48/A: switching the editorial locale switches which language's
  // values the table edits — this is the exact regression the task
  // required re-verifying from scratch, not trusting the prior PR summary.
  it("Bloc48/A: switching the locale selector switches the table to the English values", () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText("Langue du texte"), {
      target: { value: "en" },
    });
    expect(screen.getByLabelText("Équipement — ligne 1 Nom")).toHaveValue(
      "Item A",
    );
    expect(
      screen.getByLabelText("Équipement — ligne 1 Description"),
    ).toHaveValue("Description A EN");
    expect(screen.queryByDisplayValue("Objet A")).not.toBeInTheDocument();
  });

  // Bloc 48/B: each of the 4 tables has its own "Ajouter" button, scoped to
  // its own category — no more per-row category select.
  it("Bloc48/B: each category has its own scoped Add button that only affects that table", () => {
    renderScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter (Conseillers)" }),
    );
    expect(screen.getByLabelText("Conseillers — ligne 1 Nom")).toHaveValue("");
    // The equipment/inventory tables are untouched by the advisors add.
    expect(screen.getByLabelText("Équipement — ligne 1 Nom")).toHaveValue(
      "Objet A",
    );
    expect(
      screen.queryByLabelText("Équipement — ligne 2 Nom"),
    ).not.toBeInTheDocument();
  });

  it("Bloc48/B: removes a row from only its own category table", () => {
    renderScreen();
    fireEvent.click(
      within(screen.getByTestId("row-0-equipment")).getAllByRole("button", {
        name: "Supprimer",
      })[0],
    );
    expect(
      screen.queryByLabelText("Équipement — ligne 1 Nom"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Inventaire — ligne 1 Nom")).toHaveValue(
      "Objet B",
    );
  });

  // Bloc 48/B: up/down ordering is scoped independently per category — a
  // category with a single row has both its move buttons disabled.
  it("Bloc48/B: disables move buttons at each table's own boundaries", () => {
    renderScreen();
    const moveUpButtons = screen.getAllByRole("button", { name: "Monter" });
    const moveDownButtons = screen.getAllByRole("button", {
      name: "Descendre",
    });
    for (const button of [...moveUpButtons, ...moveDownButtons])
      expect(button).toBeDisabled();
  });

  // Bloc 44 review: a single action persists both sections together — no
  // separate button per section that could be clicked while leaving the
  // other one's edits unsaved.
  it("saves both the intro (PATCH) and the grouped catalog (PUT) from the one save button", async () => {
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
    expect(JSON.parse(String(rowsCall?.[1]?.body))).toEqual(initialCatalog());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Référentiel enregistré.",
    );
  });

  it("blocks saving entirely when a required field is emptied, without calling fetch", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderScreen();
    fireEvent.change(screen.getByLabelText("Équipement — ligne 1 Nom"), {
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
