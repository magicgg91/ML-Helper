import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combatReferenceRows,
  expeditionReferenceRows,
} from "../lib/reference-equipment";
import { templarCosts } from "../lib/gems-templars";
import {
  CombatReferenceAdmin,
  ExpeditionReferenceAdmin,
  TemplarReferenceAdmin,
} from "./reference-admin-editors";

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
      container.querySelector('input[aria-label="Ligne 1 set"]')!,
      {
        target: { value: "Set confirmé modifié" },
      },
    );
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(180);
    expect(body[0].set_name).toBe("Set confirmé modifié");
  });
  it("exposes every expedition row and every templar cost", () => {
    const { unmount } = render(
      <ExpeditionReferenceAdmin initialRows={[...expeditionReferenceRows]} />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(121);
    expect(screen.getByLabelText("Expédition ligne 1 valeur type")).toHaveValue(
      5.4,
    );
    unmount();
    render(<TemplarReferenceAdmin initialCosts={[...templarCosts]} />);
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(
      screen.getByRole("spinbutton", { name: "Coût Templier niveau 20" }),
    ).toHaveValue(21929);
  });
  it("blocks invalid cells with a visible message", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<TemplarReferenceAdmin initialCosts={[...templarCosts]} />);
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Coût Templier niveau 1" }),
      { target: { value: "-1" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer toute la table" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Corrige les champs signalés",
    );
    expect(screen.getByText("La valeur minimale est 0.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
