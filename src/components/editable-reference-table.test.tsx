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
});
