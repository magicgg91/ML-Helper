import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EditableDataTable,
  EditableReferenceTable,
  type EditableColumn,
} from "./editable-reference-table";
import { renderWithIntl as render } from "../test/render-with-intl";

type Row = { name: string; amount: string };

const columns: EditableColumn<Row>[] = [
  { key: "name", label: "Nom", required: true },
  { key: "amount", label: "Montant", type: "number", min: 1, required: true },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EditableDataTable", () => {
  it("adds and removes rows without touching validation", () => {
    const onChange = vi.fn();
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
        addLabel="Ajouter"
        removeLabel="Retirer"
        emptyLabel="Aucune ligne"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("Bloc 92/A11y (M4/L3): links the field error via aria-describedby and marks required columns", () => {
    render(
      <EditableDataTable
        rows={[{ name: "", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        addLabel="Ajouter"
        removeLabel="Retirer"
        emptyLabel="Aucune ligne"
        errors={{ "0:name": "Le nom est obligatoire" }}
      />,
    );
    const nameInput = screen.getByLabelText("Nom 1");
    // L3: required columns expose aria-required to assistive tech.
    expect(nameInput).toHaveAttribute("aria-required", "true");
    // M4: the invalid field points at the id of its visible error text.
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    const describedBy = nameInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Le nom est obligatoire",
    );
  });

  it("Bloc43: offers row reordering only when onMove is provided, disabled at the boundaries", () => {
    const onMove = vi.fn();
    render(
      <EditableDataTable
        rows={[
          { name: "Alpha", amount: "1" },
          { name: "Beta", amount: "2" },
        ]}
        columns={columns}
        onChange={vi.fn()}
        onMove={onMove}
        moveUpLabel="Monter"
        moveDownLabel="Descendre"
      />,
    );
    const up = screen.getAllByRole("button", { name: "Monter" });
    const down = screen.getAllByRole("button", { name: "Descendre" });
    expect(up[0]).toBeDisabled();
    expect(down[1]).toBeDisabled();
    fireEvent.click(down[0]);
    expect(onMove).toHaveBeenCalledWith(0, 1);
    fireEvent.click(up[1]);
    expect(onMove).toHaveBeenCalledWith(1, -1);
  });

  it("Bloc46/B: renders the move buttons as arrow icons, not text", () => {
    render(
      <EditableDataTable
        rows={[
          { name: "Alpha", amount: "1" },
          { name: "Beta", amount: "2" },
        ]}
        columns={columns}
        onChange={vi.fn()}
        onMove={vi.fn()}
        moveUpLabel="Monter"
        moveDownLabel="Descendre"
      />,
    );
    const up = screen.getAllByRole("button", { name: "Monter" });
    const down = screen.getAllByRole("button", { name: "Descendre" });
    for (const button of [...up, ...down]) {
      expect(button).toHaveTextContent("");
      expect(button.querySelector("svg")).toBeInTheDocument();
    }
  });

  it("Bloc43: renders no move buttons at all when onMove is omitted (Ranking's own usage)", () => {
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /monter|descendre/i }),
    ).not.toBeInTheDocument();
  });

  it("Bloc35 9.1: narrows only the columns marked narrow, not the others", () => {
    const narrowColumns: EditableColumn<Row>[] = [
      { key: "name", label: "Nom", required: true },
      {
        key: "amount",
        label: "Montant",
        type: "number",
        min: 1,
        required: true,
        narrow: true,
      },
    ];
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={narrowColumns}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Nom 1").closest("td")).not.toHaveClass(
      "reference-admin-narrow",
    );
    expect(screen.getByLabelText("Montant 1").closest("td")).toHaveClass(
      "reference-admin-narrow",
    );
  });

  // Bloc 49/B: opt-in icon rendering — other callers (Ranking) keep the
  // plain text "Retirer"/"Supprimer" button untouched.
  it("Bloc49/B: renders the remove control as a red X icon when removeIcon is set", () => {
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        removeLabel="Supprimer"
        removeIcon
      />,
    );
    const button = screen.getByRole("button", { name: "Supprimer" });
    expect(button).toHaveTextContent("");
    expect(button.querySelector("svg")).toBeInTheDocument();
    expect(button).toHaveClass("danger-action");
  });

  // Bloc 49/B: row deletion is irreversible and previously fired with no
  // confirmation at all — removeConfirmMessage gates it behind
  // window.confirm, and a decline must leave the row untouched.
  it("Bloc49/B: confirms before removing when removeConfirmMessage is set, and does nothing on decline", () => {
    const onRemove = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        onRemove={onRemove}
        removeLabel="Supprimer"
        removeIcon
        removeConfirmMessage="Supprimer définitivement cet objet ?"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(confirmSpy).toHaveBeenCalledWith(
      "Supprimer définitivement cet objet ?",
    );
    expect(onRemove).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("Bloc49/B: removes immediately, with no confirmation prompt, when removeConfirmMessage is omitted (every other caller's existing behavior)", () => {
    const onRemove = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm");
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        onRemove={onRemove}
        removeLabel="Retirer"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  // Bloc 53/A: Boutique's 4 tables merge move-up/move-down/remove into a
  // single "Actions" column instead of 3 separate ones — opt-in via
  // combinedActions, and only takes effect when both onMove and onRemove
  // are provided (every other caller keeps its separate column(s)).
  it("Bloc53/A: combines move and remove into a single Actions column when combinedActions is set", () => {
    render(
      <EditableDataTable
        rows={[
          { name: "Alpha", amount: "1" },
          { name: "Beta", amount: "2" },
        ]}
        columns={columns}
        onChange={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
        moveUpLabel="Monter"
        moveDownLabel="Descendre"
        removeLabel="Supprimer"
        removeIcon
        combinedActions
        actionsLabel="Actions"
      />,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).toEqual(["Nom", "Montant", "Actions"]);
    expect(
      screen.queryByRole("columnheader", { name: "Monter" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Supprimer" }),
    ).not.toBeInTheDocument();
    const firstRowCell = screen.getAllByRole("row")[1].querySelectorAll("td");
    const actionsCell = firstRowCell[firstRowCell.length - 1];
    expect(actionsCell.querySelectorAll("button")).toHaveLength(3);
  });

  // Bloc 62/A: the flex layout must live on an inner <div>, not the <td>
  // itself — a flexed <td> broke Boutique's table-layout: fixed column
  // width resolution, collapsing the Actions column to a sliver too
  // narrow for its 3 icons, which then wrapped onto separate lines even
  // on a wide screen.
  it("Bloc62/A: wraps the combined Actions cell's buttons in an inner .reference-admin-move-cell div, not the <td> itself", () => {
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
        moveUpLabel="Monter"
        moveDownLabel="Descendre"
        removeLabel="Supprimer"
        removeIcon
        combinedActions
        actionsLabel="Actions"
      />,
    );
    const firstRowCells = screen.getAllByRole("row")[1].querySelectorAll("td");
    const actionsCell = firstRowCells[firstRowCells.length - 1];
    expect(actionsCell.className).toBe("");
    const inner = actionsCell.querySelector(
      ":scope > .reference-admin-move-cell",
    );
    expect(inner).not.toBeNull();
    expect(inner?.tagName).toBe("DIV");
    expect(inner?.querySelectorAll("button")).toHaveLength(3);
  });

  it("Bloc53/A: keeps separate move/remove columns when combinedActions is not set (Ranking's own usage)", () => {
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        removeLabel="Supprimer"
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Supprimer" }),
    ).toBeInTheDocument();
  });

  // Bloc 53/C: mirrors the existing narrow flag in the other direction —
  // gives Boutique's Description column relatively more width.
  it("Bloc53/C: widens only the columns marked wide, not the others", () => {
    const wideColumns: EditableColumn<Row>[] = [
      { key: "name", label: "Nom", required: true, wide: true },
      { key: "amount", label: "Montant", type: "number", min: 1 },
    ];
    render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={wideColumns}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Nom 1").closest("td")).toHaveClass(
      "reference-admin-wide",
    );
    expect(screen.getByLabelText("Montant 1").closest("td")).not.toHaveClass(
      "reference-admin-wide",
    );
  });

  // Bloc 53/B, C: a Boutique-only scoping class on the <table>, so its CSS
  // (globals.css .consumables-admin-table) never touches Combat/Expedition/
  // Ranking's own tables, which don't pass this prop.
  it("Bloc53/B, C: applies the optional tableClassName to the table element", () => {
    const { container } = render(
      <EditableDataTable
        rows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
        tableClassName="consumables-admin-table"
      />,
    );
    expect(container.querySelector("table")).toHaveClass(
      "consumables-admin-table",
    );
  });

  // Bloc 64/B: the live **bold** preview line added under each input at
  // Bloc 62/B is gone — a cell holds its input (plus an error message when
  // there is one) and nothing else. The **markers** stay raw text in the
  // input; the rendered result is checked on the public page instead.
  it("Bloc64/B: renders no rendered preview beside the input, only the raw value", () => {
    const { container } = render(
      <EditableDataTable
        rows={[{ name: "Jarre **divine**", amount: "1" }]}
        columns={columns}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Jarre **divine**")).toBeInTheDocument();
    expect(container.querySelector(".field-bold-preview")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
    // Nothing renders the value a second time next to the input.
    expect(screen.queryByText("Jarre divine")).not.toBeInTheDocument();
  });

  it("shows the empty label instead of an empty table", () => {
    render(
      <EditableDataTable
        rows={[]}
        columns={columns}
        onChange={vi.fn()}
        emptyLabel="Aucune ligne"
      />,
    );
    expect(screen.getByText("Aucune ligne")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("EditableReferenceTable", () => {
  it("blocks the save and reports every invalid field", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <EditableReferenceTable
        initialRows={[{ name: "", amount: "0" }]}
        columns={columns}
        endpoint="/api/admin/guides/references/example"
        description="Table de test"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la table" }),
    );
    expect(screen.getByText("Ce champ est obligatoire.")).toBeVisible();
    expect(screen.getByText("La valeur minimale est 1.")).toBeVisible();
    expect(
      screen.getByText("Corrige les champs signalés avant l’enregistrement."),
    ).toBeVisible();
    const nameField = screen.getByLabelText("Ligne 1 Nom");
    expect(nameField).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a field's error as soon as it is edited, then saves", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(
      <EditableReferenceTable
        initialRows={[{ name: "", amount: "5" }]}
        columns={columns}
        endpoint="/api/admin/guides/references/example"
        description="Table de test"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la table" }),
    );
    expect(screen.getByText("Ce champ est obligatoire.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Ligne 1 Nom"), {
      target: { value: "Alpha" },
    });
    expect(
      screen.queryByText("Ce champ est obligatoire."),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la table" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/guides/references/example",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(await screen.findByText("Référentiel enregistré.")).toBeVisible();
  });

  it("Bloc38/Q: adds the wide-inputs modifier class only when the wideInputs prop is set", () => {
    const { container, unmount } = render(
      <EditableReferenceTable
        initialRows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        endpoint="/api/admin/guides/references/example"
        description="Table de test"
      />,
    );
    expect(container.querySelector(".reference-admin-wide-inputs")).toBeNull();
    unmount();
    const { container: wideContainer } = render(
      <EditableReferenceTable
        initialRows={[{ name: "Alpha", amount: "1" }]}
        columns={columns}
        endpoint="/api/admin/guides/references/example"
        description="Table de test"
        wideInputs
      />,
    );
    expect(
      wideContainer.querySelector(".reference-admin-wide-inputs"),
    ).not.toBeNull();
  });
});
