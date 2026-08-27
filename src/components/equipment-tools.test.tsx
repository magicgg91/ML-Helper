import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StuffComparison, StuffSimulator } from "./equipment-tools";
import { playerStorageKey } from "./player-settings-panel";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { combatEquipmentData } from "../lib/equipment-data";
import {
  defaultPlayerSettings,
  emptySkills,
  emptyTemplars,
} from "../lib/player-settings";
import type { CombatReferenceRow } from "../lib/reference-equipment";

const combatRows = combatEquipmentData as readonly CombatReferenceRow[];

function globalSummarySection() {
  return screen
    .getByRole("heading", {
      name: "Récapitulatif des compétences d’équipement",
    })
    .closest("section")!;
}

function capTestRow(valuePct: string) {
  return {
    rarity: "Commun",
    set_name: "Cap Test",
    family: "Or",
    skydust: "10",
    gem_slots: "0",
    slot_type: "Amulette",
    slot_name: "",
    skill_1: "Récupération",
    value_1_pct: valuePct,
    skill_2: "",
    value_2_pct: "",
    skill_3: "",
    value_3_pct: "",
    skill_4: "",
    value_4_pct: "",
  };
}

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

  it("shows one compact 'Gemme N' label per row and no separate gem-count heading", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Attaque Amulette" }),
      { target: { value: "Légendaire|Spirit Fyra" } },
    );
    expect(
      screen.queryByRole("heading", { name: /Gemmes/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Gemme 1")).toBeInTheDocument();
    expect(screen.getByText("Gemme 2")).toBeInTheDocument();
    expect(screen.getByText("Gemme 3")).toBeInTheDocument();
    // The 3 selects for one row are still individually addressable by
    // their accessible name, just without a separately rendered label.
    expect(
      screen.getByRole("combobox", { name: "Compétence gemme 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Étoiles gemme 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Ligue gemme 1" }),
    ).toBeVisible();
  });

  it("colors the slot cell by rarity without a redundant rarity text badge", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    const select = screen.getByRole("combobox", {
      name: "Équipement Attaque Amulette",
    });
    // The config panel's own equipment selector keeps its rarity-prefixed
    // option labels (e.g. "Légendaire — ... (Attaque)") — only the grid
    // cell's redundant text badge is removed, not this selector.
    expect(select.querySelectorAll("option")[1]).toHaveTextContent(
      /Légendaire.*Attaque/,
    );
    fireEvent.change(select, { target: { value: "Légendaire|Spirit Fyra" } });
    expect(amulet).toHaveStyle({ borderColor: "var(--rarity-legendaire)" });
    expect(amulet.querySelector(".rarity-badge")).toBeNull();
    expect(amulet).not.toHaveTextContent("Légendaire");
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

  it("labels the top summary as the equipment skills recap", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    expect(
      screen.getByRole("heading", {
        name: "Récapitulatif des compétences d’équipement",
      }),
    ).toBeInTheDocument();
  });

  it("links the active cell's config panel to it via a shared active class", () => {
    const { container } = renderTool(<StuffSimulator combatRows={combatRows} />);
    const panel = container.querySelector(".stuff-editor-panel")!;
    expect(panel).not.toHaveClass("stuff-editor-panel-active");
    fireEvent.click(screen.getAllByRole("button", { name: /Amulette/ })[0]);
    expect(panel).toHaveClass("stuff-editor-panel-active");
  });

  it("shows the cap and the real value in parentheses once the real value exceeds it", () => {
    renderTool(<StuffSimulator combatRows={[capTestRow("60")]} />);
    const defenseAmulet = screen.getAllByRole("button", { name: /Amulette/ })[1];
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    const box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    expect(box).toHaveTextContent("+50%");
    expect(box).toHaveTextContent("(60%)");
  });

  it("shows the real value alone, with no parentheses, when it doesn't exceed the cap", () => {
    renderTool(<StuffSimulator combatRows={[capTestRow("30")]} />);
    const defenseAmulet = screen.getAllByRole("button", { name: /Amulette/ })[1];
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    const box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    expect(box).toHaveTextContent("+30%");
    expect(box.querySelector("small")).toBeNull();
  });

  it("transfers computed equipment skills without touching skill points or clan temple", () => {
    const seeded = {
      ...defaultPlayerSettings(),
      league: "diamond",
      skillPoints: { ...emptySkills(), striker: 5 },
      clanTemple: { ...emptyTemplars(), striker: 2 },
      equipmentSkills: { ...emptySkills(), striker: 99 },
      v: 2,
    };
    localStorage.setItem(playerStorageKey, JSON.stringify(seeded));
    renderTool(<StuffSimulator combatRows={[capTestRow("30")]} />);
    const defenseAmulet = screen.getAllByRole("button", { name: /Amulette/ })[1];
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Transférer vers les Paramètres du joueur",
      }),
    );
    expect(
      screen.getByText("Transféré dans les Paramètres du joueur !"),
    ).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(playerStorageKey)!);
    expect(saved.equipmentSkills.cautious).toBe(30);
    // Overwritten to 0, not left at its stale pre-transfer value: no
    // equipment grants "striker" in this test's single override row.
    expect(saved.equipmentSkills.striker).toBe(0);
    expect(saved.skillPoints).toEqual(seeded.skillPoints);
    expect(saved.clanTemple).toEqual(seeded.clanTemple);
  });

  it("keeps the transfer button available with no equipment configured, to clear a stale transfer", () => {
    const seeded = {
      ...defaultPlayerSettings(),
      equipmentSkills: { ...emptySkills(), striker: 40 },
    };
    localStorage.setItem(playerStorageKey, JSON.stringify(seeded));
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const section = globalSummarySection();
    expect(within(section).getByText("Aucun équipement configuré"))
      .toBeInTheDocument();
    fireEvent.click(
      within(section).getByRole("button", {
        name: "Transférer vers les Paramètres du joueur",
      }),
    );
    const saved = JSON.parse(localStorage.getItem(playerStorageKey)!);
    expect(saved.equipmentSkills.striker).toBe(0);
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
