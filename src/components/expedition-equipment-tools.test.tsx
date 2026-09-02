import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { ExpeditionEquipmentSimulator } from "./expedition-equipment-tools";
import { expeditionEquipmentData } from "../lib/equipment-data";
import type { ExpeditionReferenceRow } from "../lib/reference-equipment";

const expeditionRows =
  expeditionEquipmentData as readonly ExpeditionReferenceRow[];
const storageKey = "mlhelper_expedition_equipment_simulator";

function renderTool() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ExpeditionEquipmentSimulator rows={expeditionRows} />
    </NextIntlClientProvider>,
  );
}

function summarySection() {
  return screen
    .getByRole("heading", {
      name: "Récapitulatif des compétences d’expédition",
    })
    .closest("section")!;
}

describe("ExpeditionEquipmentSimulator", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("shows the 10-stat grid at 0% for a completely empty loadout, not an empty-summary message (E.3)", () => {
    renderTool();
    const summary = summarySection();
    expect(
      within(summary).queryByText("Aucun équipement configuré"),
    ).not.toBeInTheDocument();
    expect(within(summary).getAllByText("+0%")).toHaveLength(10);
  });

  it("shows the cross-link to the full expedition equipment reference", () => {
    renderTool();
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(
      screen.getByRole("link", { name: /Équipements d’Expédition$/ }),
    ).toHaveAttribute("href", "/referentiels/expedition-equipment");
    // Bloc 55/A: the cross-reference banner sits after the tool's own
    // content (summary, filters, slot grid), not before it.
    expect(
      summarySection().compareDocumentPosition(
        screen.getByRole("link", { name: /Équipements d’Expédition$/ }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lays out the 6 slots in the confirmed grid order, no gem configuration", () => {
    const { container } = renderTool();
    const buttons = Array.from(
      container.querySelectorAll(".stuff-slot-grid button"),
    );
    expect(
      buttons.map((button) => button.querySelector("span")?.textContent),
    ).toEqual(["Cape", "Longue-vue", "Bourse", "Boussole", "Torche", "Pioche"]);
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    expect(screen.queryByText(/Gemmes/)).not.toBeInTheDocument();
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
      expect(localStorage.getItem(storageKey)).toContain("Vanna"),
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
    const summary = summarySection();
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

  it("falls back to the default empty configs instead of crashing on a malformed saved value", async () => {
    localStorage.setItem(storageKey, JSON.stringify({ not: "configs" }));
    renderTool();
    await waitFor(() =>
      expect(
        screen.getByText("Clique sur un emplacement pour le configurer."),
      ).toBeInTheDocument(),
    );
    for (const slot of [
      "Cape",
      "Longue-vue",
      "Bourse",
      "Boussole",
      "Torche",
      "Pioche",
    ])
      expect(
        screen.getByRole("button", { name: new RegExp(slot) }),
      ).toHaveTextContent("Vide");
  });

  it("shows all 10 skills in the fixed Bloc 31/E.2 order, including those still at 0%", () => {
    renderTool();
    // Configure just one slot: Vanna only contributes to Or + Vitalité, so
    // the other 8 skills stay at 0% but must still be listed (E.3).
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement d’expédition Cape" }),
      { target: { value: "Légendaire|Vanna" } },
    );
    const summary = summarySection();
    const labels = Array.from(
      summary.querySelectorAll(".stuff-total .label"),
    ).map((node) => node.textContent);
    expect(labels).toEqual([
      "Équipement",
      "Consommables",
      "Or",
      "Troupes",
      "Esquive",
      "Chance",
      "Perception",
      "Récupération",
      "Vitesse",
      "Vitalité",
    ]);
    // Every skill shows, even at 0% — unlike Combat's summary, which hides
    // zero-contribution skills.
    expect(within(summary).getAllByText("+0%").length).toBeGreaterThan(0);
  });

  it("restricts every slot's catalog to one primary-stat family when a filter is active (E.1)", () => {
    renderTool();
    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    const select = screen.getByRole("combobox", {
      name: "Équipement d’expédition Cape",
    });
    const options = Array.from(select.querySelectorAll("option")).slice(1);
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) expect(option.textContent).toContain("(Or)");
  });

  it("colors the E.1 filter buttons to match their equipment-family color elsewhere (Bloc 31/H)", () => {
    renderTool();
    const gold = screen.getByRole("button", { name: "Or" });
    expect(gold.style.getPropertyValue("--pill-color")).toBe("var(--amber)");
  });

  it("gives 'Personnalisé' its own color, distinct from all 4 family colors (Bloc 33/J)", () => {
    renderTool();
    const custom = screen.getByRole("button", { name: "Personnalisé" });
    const customColor = custom.style.getPropertyValue("--pill-color");
    expect(customColor).not.toBe("");
    for (const family of [
      "Or",
      "Équipement combat",
      "Consommables",
      "Troupes",
    ]) {
      const familyColor = screen
        .getByRole("button", { name: family })
        .style.getPropertyValue("--pill-color");
      expect(customColor).not.toBe(familyColor);
    }
  });

  it("keeps each filter's loadout independent — switching filters never overwrites another one's saved config", () => {
    renderTool();
    // Configure a slot under "Personnalisé" (custom).
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement d’expédition Cape" }),
      { target: { value: "Légendaire|Vanna" } },
    );
    expect(screen.getByRole("button", { name: /Cape/ })).toHaveTextContent(
      "1★",
    );
    // Switch to the "Or" filter — its own Cape slot starts empty.
    fireEvent.click(screen.getByRole("button", { name: "Or" }));
    expect(screen.getByRole("button", { name: /Cape/ })).toHaveTextContent(
      "Vide",
    );
    // Switch back to "Personnalisé" — the earlier selection is still there.
    fireEvent.click(screen.getByRole("button", { name: "Personnalisé" }));
    expect(screen.getByRole("button", { name: /Cape/ })).not.toHaveTextContent(
      "Vide",
    );
  });

  it("shows the active slot's own contribution in parentheses next to the total (E.5)", () => {
    renderTool();
    for (const slot of ["Cape", "Longue-vue"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(slot) }));
      fireEvent.change(
        screen.getByRole("combobox", {
          name: `Équipement d’expédition ${slot}`,
        }),
        { target: { value: "Légendaire|Vanna" } },
      );
    }
    // Longue-vue's panel is now open (last clicked); Cape + Longue-vue both
    // contribute 5.4% Or, so the total is 10.8% with Longue-vue's own 5.4%
    // shown alongside it.
    const summary = summarySection();
    const orBox = within(summary).getByText("Or").closest(".stuff-total")!;
    expect(orBox).toHaveTextContent("+10,8%");
    expect(orBox).toHaveTextContent("(5,4%)");
  });

  it("keeps the contribution parenthesis on the same line as the total, to its right (Bloc 32/E.2)", () => {
    renderTool();
    fireEvent.click(screen.getByRole("button", { name: /Cape/ }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement d’expédition Cape" }),
      { target: { value: "Légendaire|Vanna" } },
    );
    const summary = summarySection();
    const orBox = within(summary).getByText("Or").closest(".stuff-total")!;
    const value = orBox.querySelector("strong.value")!;
    const small = value.querySelector("small")!;
    // The contribution is a child of the same <strong> line as the total,
    // not a separately positioned block sibling below it.
    expect(value.contains(small)).toBe(true);
  });

  it("positions the filter row under the global summary, matching Combat's family-button row (Bloc 32/E.1)", () => {
    const { container } = renderTool();
    const stack = container.querySelector(".calculator-stack")!;
    const sections = Array.from(stack.querySelectorAll(":scope > *"));
    const summaryIndex = sections.findIndex((node) =>
      node.contains(
        screen.getByRole("heading", {
          name: "Récapitulatif des compétences d’expédition",
        }),
      ),
    );
    const filterRow = container.querySelector(".family-buttons")!;
    const filterIndex = sections.findIndex((node) => node.contains(filterRow));
    const gridIndex = sections.findIndex((node) =>
      node.contains(screen.getByRole("button", { name: /Cape/ })),
    );
    expect(summaryIndex).toBeGreaterThanOrEqual(0);
    expect(filterIndex).toBeGreaterThan(summaryIndex);
    expect(gridIndex).toBeGreaterThan(filterIndex);
    // Not nested inside the grid+panel card — a direct sibling of it.
    expect(filterRow.closest(".stuff-block")).toBeNull();
  });

  it("gives the filter row a dedicated class and keeps the 5 filters in the 3+2 mobile-grid order (Bloc 72/D)", () => {
    const { container } = renderTool();
    const filterRow = container.querySelector(".family-buttons")!;
    expect(filterRow).toHaveClass("expedition-sim-family-buttons");
    const buttons = within(filterRow as HTMLElement).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Personnalisé",
      "Or",
      "Équipement combat",
      "Consommables",
      "Troupes",
    ]);
  });
});
