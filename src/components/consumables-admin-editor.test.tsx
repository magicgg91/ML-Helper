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
const introRow = {
  image: "/consumables/sapphires.webp",
  name_fr: "Saphirs",
  name_en: "Sapphires",
  description_fr: "Description intro FR",
  description_en: "Description intro EN",
  cost: "",
};

function initialCatalog(): ConsumableCatalog {
  return {
    intro: [introRow],
    advisors: [],
    equipment: [rowA],
    expedition: [],
    inventory: [rowB],
  };
}

function renderScreen() {
  return render(
    <ConsumablesReferenceScreen initialCatalog={initialCatalog()} />,
  );
}

function saveButton() {
  return screen.getByRole("button", { name: "Enregistrer toute la page" });
}

describe("ConsumablesReferenceScreen", () => {
  afterEach(cleanup);
  beforeEach(() => vi.restoreAllMocks());

  // Bloc 52/E: the helper sentences above the items tables were removed —
  // the interface should read clearly without them.
  it("Bloc52/E: has no explanatory helper text above the tables", () => {
    renderScreen();
    expect(
      screen.queryByText(/Zone de texte libre en markdown/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Ajoute, réordonne ou supprime librement/),
    ).not.toBeInTheDocument();
  });

  it("shows one back link, one combined save button, an Intro table and 4 category tables", () => {
    renderScreen();
    expect(screen.getAllByRole("link", { name: "← Retour" })).toHaveLength(1);
    expect(saveButton()).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Intro" })).toBeInTheDocument();
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

  // Bloc 58/A: Intro is the very first table in the DOM, before any of the
  // 4 category tables — reusing the exact same admin table pattern.
  it("Bloc58/A: renders the Intro table before the 4 category tables", () => {
    renderScreen();
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Intro",
      "Conseillers",
      "Équipement",
      "Expédition",
      "Inventaire",
    ]);
  });

  // Bloc 58/A: 3 columns only (Image, Nom, Description) — no Coût column,
  // unlike the 4 category tables.
  it("Bloc58/A: the Intro table has no Coût column", () => {
    renderScreen();
    expect(
      screen.getByLabelText("Intro — ligne 1 Nom"),
    ).toHaveValue("Saphirs");
    expect(
      screen.queryByLabelText("Intro — ligne 1 Coût"),
    ).not.toBeInTheDocument();
  });

  // Bloc 48/A: regression fix — the locale selector already driving the
  // items table columns must show only 2 text columns (Nom + Description)
  // in the active language at a time, never all 4 (FR+EN name, FR+EN
  // description) simultaneously — this now includes the Intro table too.
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
    // Intro, equipment and inventory have rows (and therefore a rendered
    // header) in this fixture — advisors/expedition start empty.
    expect(screen.getAllByText("Nom")).toHaveLength(3);
    expect(screen.getAllByText("Description")).toHaveLength(3);
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

  // Bloc 64/B: the Bloc 62/B live preview is gone — the **bold** syntax
  // still works, but it's only rendered on the public page; admin keeps a
  // plain text field, nothing rendered beside it.
  it("Bloc64/B: shows no rendered preview under Nom/Description, just the raw field", () => {
    const { container } = renderScreen();
    const nameInput = screen.getByLabelText("Équipement — ligne 1 Nom");
    fireEvent.change(nameInput, { target: { value: "Objet **rare**" } });
    expect(nameInput).toHaveValue("Objet **rare**");
    expect(container.querySelector(".field-bold-preview")).toBeNull();
    expect(screen.queryByText("rare", { selector: "strong" })).toBeNull();
  });

  // Bloc 48/B: each table has its own "Ajouter" button, scoped to its own
  // section — no more per-row category select.
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

  // Bloc 58/A: the Intro table gets the exact same CRUD as the 4 category
  // tables — a scoped "+" Add button of its own.
  it("Bloc58/A: the Intro table has its own scoped Add button, adding a row only to Intro", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter (Intro)" }));
    expect(screen.getByLabelText("Intro — ligne 2 Nom")).toHaveValue("");
    expect(
      screen.queryByLabelText("Équipement — ligne 2 Nom"),
    ).not.toBeInTheDocument();
  });

  // Bloc 49/A: the verbose "Ajouter (Catégorie)" text button is now a "+"
  // icon, sitting on the same line as the table's own title.
  it("Bloc49/A: renders the Add control as a '+' icon on the table's own title row, for each table", () => {
    renderScreen();
    for (const category of [
      "Intro",
      "Conseillers",
      "Équipement",
      "Expédition",
      "Inventaire",
    ]) {
      const button = screen.getByRole("button", {
        name: `Ajouter (${category})`,
      });
      expect(button).toHaveTextContent("");
      expect(button.querySelector("svg")).toBeInTheDocument();
      const titleRow = button.closest(".editable-reference-title-row");
      expect(titleRow).not.toBeNull();
      expect(
        within(titleRow as HTMLElement).getByRole("heading", {
          name: category,
        }),
      ).toBeInTheDocument();
    }
  });

  it("Bloc48/B + 49/B: removes a row from only its own category table, after confirming", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
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
    // The Intro table is untouched by removing an equipment row.
    expect(screen.getByLabelText("Intro — ligne 1 Nom")).toHaveValue(
      "Saphirs",
    );
  });

  // Bloc 49/B: the remove control is a red X icon, and deletion is
  // irreversible — it must never happen without an explicit confirmation,
  // and declining it must leave the row untouched.
  it("Bloc49/B: renders a red X icon and asks for confirmation before actually deleting a row", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderScreen();
    const removeButton = within(
      screen.getByTestId("row-0-equipment"),
    ).getAllByRole("button", { name: "Supprimer" })[0];
    expect(removeButton).toHaveTextContent("");
    expect(removeButton.querySelector("svg")).toBeInTheDocument();
    expect(removeButton).toHaveClass("danger-action");

    fireEvent.click(removeButton);
    expect(confirmSpy).toHaveBeenCalled();
    // Declined: the row is still there, untouched.
    expect(screen.getByLabelText("Équipement — ligne 1 Nom")).toHaveValue(
      "Objet A",
    );

    confirmSpy.mockReturnValue(true);
    fireEvent.click(removeButton);
    expect(
      screen.queryByLabelText("Équipement — ligne 1 Nom"),
    ).not.toBeInTheDocument();
  });

  // Bloc 53/A: the 3 separate Monter/Descendre/Supprimer columns are now a
  // single "Actions" column, on every table.
  it("Bloc53/A: shows a single 'Actions' column instead of separate Monter/Descendre/Supprimer columns, on every table", () => {
    renderScreen();
    const actionsHeaders = screen.getAllByRole("columnheader", {
      name: "Actions",
    });
    // Intro, equipment and inventory have rows in this fixture, so only
    // those 3 tables render a <thead> at all.
    expect(actionsHeaders).toHaveLength(3);
    expect(
      screen.queryByRole("columnheader", { name: "Monter" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Supprimer" }),
    ).not.toBeInTheDocument();
    const equipmentRow = screen.getByTestId("row-0-equipment");
    const actionsCell = equipmentRow.querySelectorAll("td")[
      equipmentRow.querySelectorAll("td").length - 1
    ];
    expect(actionsCell.querySelectorAll("button")).toHaveLength(3);
  });

  // Bloc 53/B, C: each table is scoped with the Boutique-only width class,
  // never touching Combat/Expedition/Ranking's own tables.
  it("Bloc53/B, C: scopes every table with the consumables-admin-table class", () => {
    const { container } = renderScreen();
    const tables = container.querySelectorAll("table.consumables-admin-table");
    // Intro, equipment and inventory have rows in this fixture.
    expect(tables).toHaveLength(3);
  });

  // Bloc 48/B: up/down ordering is scoped independently per table — a
  // table with a single row has both its move buttons disabled.
  it("Bloc48/B: disables move buttons at each table's own boundaries", () => {
    renderScreen();
    const moveUpButtons = screen.getAllByRole("button", { name: "Monter" });
    const moveDownButtons = screen.getAllByRole("button", {
      name: "Descendre",
    });
    for (const button of [...moveUpButtons, ...moveDownButtons])
      expect(button).toBeDisabled();
  });

  // Bloc 44 review: a single action persists every table together — no
  // separate button per section that could be clicked while leaving the
  // other ones' edits unsaved.
  // Bloc 57/A, Bloc 58/A: the whole catalog (Intro included, as just
  // another section) is sent as a single PUT request — one write, one
  // audit log line.
  it("Bloc58/A: saves the whole catalog, Intro included, in one PUT request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    renderScreen();
    fireEvent.change(screen.getByLabelText("Intro — ligne 1 Description"), {
      target: { value: "Nouvelle description" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/guides/references/consumables");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({
      ...initialCatalog(),
      intro: [{ ...introRow, description_fr: "Nouvelle description" }],
    });
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

  it("Bloc57/A: reports a server error when the combined save request fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 500 }));
    renderScreen();
    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Impossible de joindre le serveur.",
    );
  });

  it("reports total failure when the request cannot reach the server", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    renderScreen();
    fireEvent.click(saveButton());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Impossible de joindre le serveur.",
    );
  });
});
