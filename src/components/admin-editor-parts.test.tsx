import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { CollapsibleGroup } from "./admin-collapsible-group";
import { EditorSection } from "./admin-editor-section";
import { FormulaBox } from "./admin-formula-box";
import { LangTabs } from "./admin-lang-tabs";
import { RowActions } from "./admin-row-actions";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(cleanup);

describe("Bloc 119: FormulaBox", () => {
  it("names the formula and shows the expression", () => {
    render(
      <FormulaBox note="à partir du niveau 2">
        troupes(niveau) = coefficient × ratio^niveau
      </FormulaBox>,
    );
    expect(screen.getByText("Formule")).toBeInTheDocument();
    expect(
      screen.getByText("troupes(niveau) = coefficient × ratio^niveau"),
    ).toBeInTheDocument();
    expect(screen.getByText("à partir du niveau 2")).toBeInTheDocument();
  });
});

describe("Bloc 119: EditorSection", () => {
  it("is a section with a heading of its own and room on the right", () => {
    render(
      <EditorSection
        title="Progression"
        description="Base et ratio"
        actions={<button type="button">Ajouter</button>}
      >
        <p>contenu</p>
      </EditorSection>,
    );
    const section = screen.getByRole("region", { name: "Progression" });
    expect(
      within(section).getByRole("heading", { level: 2, name: "Progression" }),
    ).toBeInTheDocument();
    expect(within(section).getByText("Base et ratio")).toBeInTheDocument();
    expect(
      within(section).getByRole("button", { name: "Ajouter" }),
    ).toBeInTheDocument();
  });
});

describe("Bloc 119: LangTabs", () => {
  function renderTabs(filled: (locale: string) => boolean = () => true) {
    const onChange = vi.fn();
    render(
      <LangTabs
        locale="fr"
        onChange={onChange}
        filled={filled}
        label="Textes en"
        languageNames={{ de: "Deutsch" }}
      />,
    );
    return { onChange };
  }

  it("offers the five languages of the site, and says what it scopes", () => {
    renderTabs();
    const group = screen.getByRole("group", { name: "Textes en" });
    expect(within(group).getAllByRole("button")).toHaveLength(5);
  });

  it("presses the one being edited", () => {
    renderTabs();
    expect(screen.getByRole("button", { name: "fr" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "en" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks a language with nothing written in it yet", () => {
    renderTabs((locale) => locale !== "de");
    const german = screen.getByRole("button", { name: "Deutsch — à créer" });
    expect(german.className).toContain("border-dashed");
  });

  it("switches without the caller losing anything — it only reports", () => {
    const { onChange } = renderTabs();
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(onChange).toHaveBeenCalledWith("en");
  });
});

describe("Bloc 119: RowActions", () => {
  function renderActions(
    props: Partial<Parameters<typeof RowActions>[0]> = {},
  ) {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const onRemove = vi.fn();
    render(
      <RowActions
        name="Bronze"
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
        {...props}
      />,
    );
    return { onMoveUp, onMoveDown, onRemove };
  }

  it("names the row each button acts on", () => {
    renderActions();
    for (const name of [
      "Monter Bronze",
      "Descendre Bronze",
      "Supprimer Bronze",
    ])
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("greys out the move a first or last row cannot make", () => {
    // Disabled rather than hidden: a control that disappears moves every
    // other one under the pointer.
    renderActions({ isFirst: true });
    expect(
      screen.getByRole("button", { name: "Monter Bronze" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Descendre Bronze" }),
    ).toBeEnabled();
  });

  it("leaves out an action the screen does not have", () => {
    renderActions({ onMoveUp: undefined, onMoveDown: undefined });
    expect(screen.queryByRole("button", { name: /Monter/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Supprimer Bronze" }),
    ).toBeInTheDocument();
  });
});

describe("Bloc 119: CollapsibleGroup", () => {
  function Group() {
    const [open, setOpen] = useState(false);
    return (
      <CollapsibleGroup
        title="Set du Dragon"
        open={open}
        onToggle={setOpen}
        count="4 emplacements"
        actions={<button type="button">Modifier le set</button>}
      >
        <p>lignes du set</p>
      </CollapsibleGroup>
    );
  }

  it("folds and unfolds from its own header", () => {
    render(<Group />);
    const header = screen.getByRole("button", { name: /Set du Dragon/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("lignes du set")).toBeVisible();
  });

  it("keeps the group's own actions out of the folding button", () => {
    // A button nested in a button is not something the browser renders.
    render(<Group />);
    const header = screen.getByRole("button", { name: /Set du Dragon/ });
    expect(
      within(header).queryByRole("button", { name: "Modifier le set" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Modifier le set" }),
    ).toBeInTheDocument();
  });

  it("says how much is inside whether it is open or not", () => {
    render(<Group />);
    expect(screen.getByText("4 emplacements")).toBeVisible();
  });
});
