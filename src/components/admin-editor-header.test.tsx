import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorHeader } from "./admin-editor-header";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(cleanup);
beforeEach(() => vi.restoreAllMocks());

function renderHeader(props: Partial<Parameters<typeof EditorHeader>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <EditorHeader
      backHref="/admin/tools"
      backLabel="Outils"
      title="Classement"
      dirty={false}
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSave, onCancel };
}

describe("Bloc 119: the top of an edit screen", () => {
  it("says where it came from and what is being edited", () => {
    renderHeader();
    const trail = screen.getByRole("navigation", { name: "Fil d’Ariane" });
    expect(trail).toHaveTextContent("← Outils / Classement");
    expect(screen.getByRole("link", { name: "← Outils" })).toHaveAttribute(
      "href",
      "/admin/tools",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Classement" }),
    ).toBeInTheDocument();
  });

  it("offers one save button, never two", () => {
    // The Templiers screen had "Enregistrer les paramètres" *and*
    // "Enregistrer toute la page" (§3 bis).
    const { onSave } = renderHeader();
    const buttons = screen.getAllByRole("button", { name: /Enregistrer/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("says everything is saved when nothing has changed", () => {
    renderHeader();
    expect(screen.getByText("✓ Tout est enregistré")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull();
  });

  it("says so when something is unsaved, and offers the way back", () => {
    const { onCancel } = renderHeader({ dirty: true });
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("asks before a link takes unsaved work away", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHeader({ dirty: true });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "← Outils" }).dispatchEvent(event);
    expect(confirm).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets the link through once the question is answered", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHeader({ dirty: true });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "← Outils" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("asks nothing at all when there is nothing to lose", () => {
    const confirm = vi.spyOn(window, "confirm");
    renderHeader({ dirty: false });
    screen
      .getByRole("link", { name: "← Outils" })
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    expect(confirm).not.toHaveBeenCalled();
  });

  it("carries the screen's own chips and the save's own word", () => {
    renderHeader({
      pills: <span>Utilisé par l’outil Gemmes</span>,
      message: "Enregistré",
    });
    expect(screen.getByText("Utilisé par l’outil Gemmes")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Enregistré");
  });
});
