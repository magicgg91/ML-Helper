import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StuffComparison, StuffSimulator } from "./equipment-tools";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { combatEquipmentData } from "../lib/equipment-data";
import type { CombatReferenceRow } from "../lib/reference-equipment";

const combatRows = combatEquipmentData as readonly CombatReferenceRow[];

function renderTool(tool: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      {tool}
    </NextIntlClientProvider>,
  );
}

describe("equipment tools", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("toggles a simulator slot and persists an exact set", async () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    expect(
      screen.getByRole("link", { name: "Voir le référentiel complet" }),
    ).toHaveAttribute("href", "/guides/referentiels/combat-equipment");
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    const select = screen.getByRole("combobox", {
      name: "Équipement Attaque Amulette",
    });
    expect(select.querySelectorAll("option")[1]).toHaveTextContent(
      /Légendaire.*Attaque/,
    );
    fireEvent.change(select, { target: { value: "Légendaire|Spirit Fyra" } });
    expect(screen.getByRole("combobox", { name: "Ligue gemme 1" })).toHaveValue(
      "",
    );
    expect(screen.getAllByText("+10%").length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(localStorage.getItem("mlhelper_stuff_simulator")).toContain(
        "Spirit Fyra",
      ),
    );
    fireEvent.click(amulet);
    expect(
      screen.queryByRole("combobox", { name: "Équipement Attaque Amulette" }),
    ).not.toBeInTheDocument();
  });

  it("colors the slot cell by rarity and attempts the real equipment image", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Attaque Amulette" }),
      { target: { value: "Légendaire|Spirit Fyra" } },
    );
    expect(amulet).toHaveStyle({ borderColor: "var(--rarity-legendaire)" });
    const badge = amulet.querySelector(".rarity-badge");
    expect(badge).toHaveClass("rarity-legendaire");
    expect(badge).toHaveTextContent("Légendaire");
    expect(amulet.querySelector("img.stuff-slot-image")).toHaveAttribute(
      "src",
      "/equipment/combat/attack-legendary-amulet.webp",
    );
    expect(amulet.querySelector(".gem-badge")).toBeNull();
  });

  it("shows the real gem image, falling back to the colored badge only once it fails to load", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Attaque Amulette" }),
      { target: { value: "Légendaire|Spirit Fyra" } },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Compétence gemme 1" }),
      { target: { value: "Attaque" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue gemme 1" }), {
      target: { value: "legend" },
    });
    const gemImage = amulet.querySelector("img.gem-badge-image")!;
    expect(gemImage).toHaveAttribute("src", "/gems/gemme-attaque-legende.png");
    expect(amulet.querySelector(".gem-badge")).toBeNull();

    fireEvent.error(gemImage);
    const gemBadge = amulet.querySelector(".gem-badge")!;
    expect(gemBadge).toHaveTextContent("1★Lég");
    expect(gemBadge).toHaveAttribute("title", "Attaque Légende 1★");
  });

  it("renders whichever combatRows it's given, not the bundled static catalog", () => {
    // Proves the admin-edited reference table actually reaches this
    // calculator: a caller-supplied row must show up in the equipment
    // dropdown even though it isn't part of equipment-data.ts.
    const overrideRow = {
      rarity: "Commun",
      set_name: "Overridden Set",
      family: "Attaque",
      skydust: "10",
      gem_slots: "0",
      slot_type: "Amulette",
      slot_name: "",
      skill_1: "Attaque",
      value_1_pct: "999",
      skill_2: "",
      value_2_pct: "",
      skill_3: "",
      value_3_pct: "",
      skill_4: "",
      value_4_pct: "",
    };
    renderTool(<StuffSimulator combatRows={[overrideRow]} />);
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    const select = screen.getByRole("combobox", {
      name: "Équipement Attaque Amulette",
    });
    expect(select.querySelectorAll("option")).toHaveLength(2);
    expect(select.querySelectorAll("option")[1]).toHaveTextContent(
      /Overridden Set/,
    );
  });

  it("compares explicit sets and colors a positive difference", () => {
    renderTool(<StuffComparison combatRows={combatRows} />);
    expect(
      screen.getAllByRole("combobox", { name: "Ligue gemme 1" })[0],
    ).toHaveValue("");
    expect(
      screen.getByRole("link", { name: "Voir le référentiel complet" }),
    ).toHaveAttribute("href", "/guides/referentiels/combat-equipment");
    const [a, b] = screen.getAllByRole("combobox", {
      name: /Équipement Attaque Amulette/,
    });
    fireEvent.change(a, { target: { value: "Commun|Barbarian" } });
    fireEvent.change(b, { target: { value: "Légendaire|Spirit Fyra" } });
    const attackRow = screen
      .getByRole("cell", { name: "Attaque" })
      .closest("tr")!;
    expect(attackRow.querySelector(".diff-positive")).toBeTruthy();
  });
});
