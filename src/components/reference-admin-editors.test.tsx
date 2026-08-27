import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combatReferenceRows,
  defaultExpeditionStarIncrements,
  expeditionReferenceRows,
} from "../lib/reference-equipment";
import {
  CombatReferenceAdmin,
  ExpeditionIncrementsAdmin,
  ExpeditionReferenceAdmin,
} from "./reference-admin-editors";
import { renderWithIntl as render } from "../test/render-with-intl";

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
    expect(screen.getByLabelText("Expédition ligne 1 Valeur type (%)")).toHaveValue(
      5.4,
    );
    expect(screen.getAllByRole("combobox", { name: "Rareté" })[0]).toBeVisible();
    unmount();
  });
  it("edits and submits the 10 expedition star increments as one row", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { container } = render(
      <ExpeditionIncrementsAdmin initial={defaultExpeditionStarIncrements} />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(
      container.querySelector('input[aria-label="Ligne 1 Or"]'),
    ).toHaveValue(0.3);
    fireEvent.change(container.querySelector('input[aria-label="Ligne 1 Or"]')!, {
      target: { value: "0.5" },
    });
    fireEvent.click(container.querySelector("button.primary-button")!);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toHaveLength(1);
    expect(body[0].Or).toBe("0.5");
    expect(body[0].Chance).toBe(String(defaultExpeditionStarIncrements.Chance));
  });

  it("derives read-only skydust and gem slots from rarity", () => {
    const { container } = render(<CombatReferenceAdmin initialRows={[...combatReferenceRows]} />);
    const rarity = container.querySelector('select[aria-label="Ligne 1 Rareté"]')!;
    fireEvent.change(rarity, { target: { value: "Rare" } });
    expect(container.querySelector('input[aria-label="Ligne 1 Pouciel"]')).toHaveValue(10);
    expect(container.querySelector('input[aria-label="Ligne 1 Gemmes"]')).toHaveValue(0);
    expect(container.querySelector('input[aria-label="Ligne 1 Pouciel"]')).toHaveAttribute("readonly");
  });
});
