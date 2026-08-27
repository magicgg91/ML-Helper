import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { ExpeditionEquipmentSimulator } from "./expedition-equipment-tools";
import { expeditionEquipmentData } from "../lib/equipment-data";
import type { ExpeditionReferenceRow } from "../lib/reference-equipment";

const expeditionRows =
  expeditionEquipmentData as readonly ExpeditionReferenceRow[];

function renderTool() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ExpeditionEquipmentSimulator rows={expeditionRows} />
    </NextIntlClientProvider>,
  );
}

describe("ExpeditionEquipmentSimulator", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("shows the cross-link to the full expedition equipment reference", () => {
    renderTool();
    expect(
      screen.getByRole("link", { name: "Voir le référentiel complet" }),
    ).toHaveAttribute("href", "/guides/referentiels/expedition-equipment");
  });

  it("lays out the 6 slots in the confirmed grid order, no gem configuration", () => {
    const { container } = renderTool();
    const buttons = Array.from(
      container.querySelectorAll(".stuff-slot-grid button"),
    );
    expect(buttons.map((button) => button.querySelector("span")?.textContent)).toEqual(
      ["Cape", "Longue-vue", "Bourse", "Boussole", "Torche", "Pioche"],
    );
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    expect(
      screen.queryByText(/Gemmes/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /gemme/i }),
    ).not.toBeInTheDocument();
  });

  it("persists an exact selection to its own, independent localStorage key", async () => {
    renderTool();
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    const select = screen.getByRole("combobox", {
      name: "Équipement d’expédition Cape",
    });
    fireEvent.change(select, { target: { value: "Légendaire|Vanna" } });
    await waitFor(() =>
      expect(
        localStorage.getItem("mlhelper_expedition_equipment_simulator"),
      ).toContain("Vanna"),
    );
    expect(localStorage.getItem("mlhelper_stuff_simulator")).toBeNull();
  });

  it("aggregates the 4 primary and up to 6 secondary stats into one summary", () => {
    renderTool();
    for (const slot of [
      "Cape",
      "Longue-vue",
      "Bourse",
      "Boussole",
      "Torche",
      "Pioche",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(slot) }));
      fireEvent.change(
        screen.getByRole("combobox", {
          name: `Équipement d’expédition ${slot}`,
        }),
        { target: { value: "Légendaire|Vanna" } },
      );
    }
    const summary = screen
      .getByRole("heading", { name: "Récapitulatif des statistiques d’expédition" })
      .closest("section")!;
    expect(summary).toHaveTextContent("Or");
    expect(summary).toHaveTextContent("+32,4%");
    expect(summary).toHaveTextContent("Vitalité");
    expect(summary).toHaveTextContent("+45%");
  });

  it("shows no rarity text badge on a configured cell", () => {
    renderTool();
    const cape = screen.getByRole("button", { name: /Cape/ });
    fireEvent.click(cape);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement d’expédition Cape" }),
      { target: { value: "Légendaire|Vanna" } },
    );
    expect(cape.querySelector(".rarity-badge")).toBeNull();
    expect(cape).toHaveStyle({ borderColor: "var(--rarity-legendaire)" });
  });

  it("falls back to the default empty state instead of crashing on a malformed saved value", async () => {
    localStorage.setItem(
      "mlhelper_expedition_equipment_simulator",
      JSON.stringify({ not: "an expedition state" }),
    );
    renderTool();
    await waitFor(() =>
      expect(
        screen.getByText("Clique sur un emplacement pour le configurer."),
      ).toBeInTheDocument(),
    );
    for (const slot of ["Cape", "Longue-vue", "Bourse", "Boussole", "Torche", "Pioche"])
      expect(
        screen.getByRole("button", { name: new RegExp(slot) }),
      ).toHaveTextContent("Vide");
  });
});
