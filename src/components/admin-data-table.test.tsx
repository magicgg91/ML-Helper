import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DataTable, type AdminTableColumn } from "./admin-data-table";

afterEach(cleanup);

type Tool = { slug: string; name: string; source: string | null; uses: number };

const tools: Tool[] = [
  { slug: "city-cost", name: "Coût de Ville", source: "shared", uses: 3 },
  { slug: "city-production", name: "Production", source: null, uses: 0 },
];

const columns: AdminTableColumn<Tool>[] = [
  { key: "name", header: "Outil", cell: (tool) => tool.name },
  {
    key: "uses",
    header: "Utilisations",
    align: "right",
    cell: (tool) => tool.uses,
  },
];

const base = {
  caption: "Outils de l'administration",
  columns,
  rowKey: (tool: Tool) => tool.slug,
  empty: "Aucun outil ne correspond.",
};

describe("Bloc 119: DataTable", () => {
  it("names the table without showing the name", () => {
    render(<DataTable {...base} rows={tools} />);
    const table = screen.getByRole("table", {
      name: "Outils de l'administration",
    });
    expect(within(table).getByText("Outils de l'administration")).toHaveClass(
      "sr-only",
    );
  });

  it("right-aligns a numeric column, header included", () => {
    render(<DataTable {...base} rows={tools} />);
    expect(
      screen.getByRole("columnheader", { name: "Utilisations" }),
    ).toHaveClass("text-right");
    expect(screen.getByRole("cell", { name: "3" })).toHaveClass("text-right");
  });

  it("puts a group's name and count above its rows, across the full width", () => {
    render(
      <DataTable
        {...base}
        groups={[
          { key: "cities", label: "Villes", count: 2, rows: tools },
          { key: "ranking", label: "Classement", count: 0, rows: [] },
        ]}
      />,
    );
    // `scope="colgroup"` maps to a columnheader, not a rowheader: the
    // sub-header labels the columns of its group.
    const heading = screen.getByRole("columnheader", { name: "Villes 2" });
    // Two columns of data — the sub-header spans both, or the grid breaks.
    expect(heading).toHaveAttribute("colspan", "2");
    expect(heading).toHaveAttribute("scope", "colgroup");
    expect(
      screen.getByRole("columnheader", { name: "Classement 0" }),
    ).toBeInTheDocument();
  });

  it("explains a row that has no action instead of leaving a hole", () => {
    // §2: "si une action n'existe pas pour une ligne, on affiche un texte
    // explicatif, jamais un trou."
    render(
      <DataTable
        {...base}
        rows={tools}
        actions={{
          header: "Action",
          cell: (tool) =>
            tool.source ? <button type="button">Modifier</button> : null,
          explain: () => "Aucun paramètre",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Modifier" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Aucun paramètre")).toBeInTheDocument();
    // Both rows end on the same column: the actions cell is always there.
    for (const row of screen.getAllByRole("row").slice(1))
      expect(within(row).getAllByRole("cell")).toHaveLength(3);
  });

  it("shows the empty message when nothing is left after a filter", () => {
    render(<DataTable {...base} rows={[]} />);
    expect(screen.getByText("Aucun outil ne correspond.")).toBeInTheDocument();
    // The columns stay on screen, so the table does not jump when the filter
    // is cleared again.
    expect(
      screen.getByRole("columnheader", { name: "Outil" }),
    ).toBeInTheDocument();
  });

  it("shows it once when every group came back empty, not per group", () => {
    render(
      <DataTable
        {...base}
        groups={[
          { key: "cities", label: "Villes", rows: [] },
          { key: "ranking", label: "Classement", rows: [] },
        ]}
      />,
    );
    expect(screen.getAllByText("Aucun outil ne correspond.")).toHaveLength(1);
    expect(screen.queryByText("Villes")).toBeNull();
    expect(screen.queryByText("Classement")).toBeNull();
  });

  it("uses the tighter row on an editing screen", () => {
    const { container } = render(
      <DataTable {...base} rows={tools} density="edit" />,
    );
    const row = container.querySelectorAll("tbody tr")[0];
    expect(row).toHaveClass("h-[var(--admin-row-h-edit)]");
  });

  it("uses the list row height by default", () => {
    const { container } = render(<DataTable {...base} rows={tools} />);
    expect(container.querySelectorAll("tbody tr")[0]).toHaveClass(
      "h-[var(--admin-row-h)]",
    );
  });
});
