import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StuffSimulator } from "./equipment-tools";
import { playerStorageKey } from "./player-settings-panel";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import { combatEquipmentData } from "../lib/equipment-data";
import {
  defaultPlayerSettings,
  emptySkills,
  emptyTemplars,
} from "../lib/player-settings";
import type { CombatReferenceRow } from "../lib/reference-equipment";

const combatRows = combatEquipmentData as readonly CombatReferenceRow[];

// Bloc 32/D.5: fixed alphabetical order of the 10 equipment skills, as
// rendered by the (now sole) global summary.
const skillsAlphabeticalOrder = [
  "Attaque",
  "Bravoure",
  "Charognard",
  "Défense",
  "Intrépide",
  "Prospérité",
  "Recruteur",
  "Récupération",
  "Recycleur",
  "Vitesse",
];

function globalSummarySection() {
  return screen
    .getByRole("heading", {
      name: "Récapitulatif des compétences d’équipement",
    })
    .closest("section")!;
}

function familyButtonsGroup() {
  return screen.getByRole("group", { name: "Filtrer par famille" });
}

function selectFamily(name: string) {
  fireEvent.click(within(familyButtonsGroup()).getByRole("button", { name }));
}

function capTestRow(valuePct: string, slot = "Amulette") {
  return {
    rarity: "Commun",
    set_name: "Cap Test",
    family: "Or",
    skydust: "10",
    gem_slots: "0",
    slot_type: slot,
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
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(
      screen.getByRole("link", { name: /Équipements de Combat$/ }),
    ).toHaveAttribute("href", "/referentiels/combat-equipment");
    // Bloc 55/A: the cross-reference banner sits after the tool's own
    // content (global summary, family filters, slot grid), not before it.
    expect(
      globalSummarySection().compareDocumentPosition(
        screen.getByRole("link", { name: /Équipements de Combat$/ }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const amulet = screen.getByRole("button", { name: /Amulette/ });
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
    const amulet = screen.getByRole("button", { name: /Amulette/ });
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

  it("gives each gem row's label and row a dedicated class so mobile can move the label above the 3 selects (Bloc 72/A)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(amulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Attaque Amulette" }),
      { target: { value: "Légendaire|Spirit Fyra" } },
    );
    const label = screen.getByText("Gemme 1");
    expect(label).toHaveClass("stuff-gem-row-label");
    expect(label.parentElement).toHaveClass("stuff-gem-row");
  });

  it("colors the slot cell by rarity without a redundant rarity text badge", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(amulet);
    const select = screen.getByRole("combobox", {
      name: "Équipement Attaque Amulette",
    });
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
    const amulet = screen.getByRole("button", { name: /Amulette/ });
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
    expect(gemImage).toHaveAttribute("src", "/gems/gem-striker-legendary.webp");
    expect(amulet.querySelector(".gem-badge")).toBeNull();

    fireEvent.error(gemImage);
    const gemBadge = amulet.querySelector(".gem-badge")!;
    expect(gemBadge).toHaveTextContent("Lég");
    expect(gemBadge).toHaveAttribute("title", "Attaque Légende 1★");
  });

  it("lays a configured cell out with the image+star on the left and the gems stacked in a column on the right (Bloc 73/D, replaces Bloc 32/D.1's single stacked line)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const amulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(amulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Attaque Amulette" }),
      { target: { value: "Légendaire|Spirit Fyra" } },
    );
    const layout = amulet.querySelector(".stuff-slot-layout")!;
    expect(layout).toBeInTheDocument();
    const left = layout.querySelector(".stuff-slot-left")!;
    const image = left.querySelector("img.stuff-slot-image")!;
    expect(image).toBeInTheDocument();
    // Review fix: the enlarged size (Bloc 73/E) is scoped to Combat via
    // this 2nd class — the shared .stuff-slot-image class alone (also
    // used by the untouched Expedition slot renderer) must stay small.
    expect(image).toHaveClass("stuff-slot-image-combat");
    // The equipment's own star sits below the image, inside the same left
    // column, not off to the side with the gems.
    expect(left.querySelector(".star-rating")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Compétence gemme 1" }),
      { target: { value: "Attaque" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue gemme 1" }), {
      target: { value: "legend" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Compétence gemme 2" }),
      { target: { value: "Charognard" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue gemme 2" }), {
      target: { value: "legend" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Compétence gemme 3" }),
      { target: { value: "Intrépide" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue gemme 3" }), {
      target: { value: "legend" },
    });
    const gems = layout.querySelector(".stuff-slot-gems")!;
    expect(gems).toBeInTheDocument();
    // All 3 gems stack as direct siblings, one per row, each carrying its
    // own icon + star rating — not a single horizontal row any more.
    expect(gems.children).toHaveLength(3);
    for (const child of Array.from(gems.children)) {
      expect(child).toHaveClass("stuff-slot-gem");
      expect(child.parentElement).toBe(gems);
      expect(child.querySelector(".star-rating")).toBeInTheDocument();
    }
  });

  it("renders whichever combatRows it's given, not the bundled static catalog", () => {
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
    const amulet = screen.getByRole("button", { name: /Amulette/ });
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

  it("always shows all 10 skills in the global summary, alphabetically sorted, at 0% by default (Bloc 32/D.5)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const summary = globalSummarySection();
    const labels = Array.from(
      summary.querySelectorAll(".stuff-total .label"),
    ).map((node) => node.textContent);
    expect(labels).toEqual(skillsAlphabeticalOrder);
    expect(within(summary).getAllByText("+0%").length).toBe(10);
  });

  it("sorts the global summary by the displayed label, not the internal French key (Codex P2 on Bloc 32/D.5)", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <StuffSimulator combatRows={combatRows} />
      </NextIntlClientProvider>,
    );
    const summary = screen
      .getByRole("heading", { name: "Equipment skills summary" })
      .closest("section")!;
    const labels = Array.from(
      summary.querySelectorAll(".stuff-total .label"),
    ).map((node) => node.textContent);
    // Sorting the French internal keys (Attaque, Bravoure, Charognard,
    // Défense, Intrépide, Prospérité, Recruteur, Récupération, Recycleur,
    // Vitesse) and translating afterward would produce a different, wrong
    // order here — this must be alphabetical in the displayed language.
    // Bloc 38/F: English labels fixed to the cdc's exact mapping (Striker,
    // Guardian, Brave, Prosperous, Rusher, Cautious, Fearless, Recruiter,
    // Scavenger, Salvager), which reorders this alphabetical list too.
    expect(labels).toEqual([
      "Brave",
      "Cautious",
      "Fearless",
      "Guardian",
      "Prosperous",
      "Recruiter",
      "Rusher",
      "Salvager",
      "Scavenger",
      "Striker",
    ]);
  });

  it("shows only one family's grid+panel at a time via colored family buttons, Attaque selected by default (Bloc 32/D.2)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const group = familyButtonsGroup();
    const attaque = within(group).getByRole("button", { name: "Attaque" });
    const defense = within(group).getByRole("button", { name: "Défense" });
    const or = within(group).getByRole("button", { name: "Or" });
    const vitesse = within(group).getByRole("button", { name: "Vitesse" });
    expect(attaque).toHaveAttribute("aria-pressed", "true");
    expect(defense).toHaveAttribute("aria-pressed", "false");
    expect(attaque.style.getPropertyValue("--pill-color")).toBe("#c0392b");
    expect(defense.style.getPropertyValue("--pill-color")).toBe("#3a6ea8");
    expect(or.style.getPropertyValue("--pill-color")).toBe("var(--amber)");
    expect(vitesse.style.getPropertyValue("--pill-color")).toBe("#9b59b6");
    // Only the active family's 9 slots are on screen.
    expect(screen.getAllByRole("button", { name: /Amulette/ })).toHaveLength(1);
    selectFamily("Défense");
    expect(defense).toHaveAttribute("aria-pressed", "true");
    expect(attaque).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByRole("button", { name: /Amulette/ })).toHaveLength(1);
  });

  it("removes the per-family summary entirely — only the global recap section exists (Bloc 32/D.4)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    expect(document.querySelectorAll(".stuff-summary-grid")).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "Attaque" }),
    ).not.toBeInTheDocument();
    selectFamily("Or");
    expect(document.querySelectorAll(".stuff-summary-grid")).toHaveLength(1);
  });

  it("keeps each family's own configuration independent while the global summary always aggregates all 4 (Bloc 32/D.2-D.3)", () => {
    renderTool(<StuffSimulator combatRows={[capTestRow("30")]} />);
    // Configure Défense's Amulette (family "Or" is one of Défense's 2
    // allowed families).
    selectFamily("Défense");
    const defenseAmulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    expect(
      within(defenseAmulet).getByRole("img", { name: "1 étoiles" }),
    ).toBeInTheDocument();
    let box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    expect(box).toHaveTextContent("+30%");
    // Switch to Attaque: its own Amulette starts empty — the Défense
    // config isn't shared or overwritten.
    selectFamily("Attaque");
    const attaqueAmulet = screen.getByRole("button", { name: /Amulette/ });
    expect(attaqueAmulet).toHaveTextContent("Vide");
    // The global aggregate still reflects Défense's contribution even
    // though Défense's block isn't the one on screen right now.
    box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    expect(box).toHaveTextContent("+30%");
    // Switching back to Défense shows the earlier selection untouched.
    selectFamily("Défense");
    expect(
      within(
        screen.getByRole("button", { name: /Amulette/ }),
      ).getByRole("img", { name: "1 étoiles" }),
    ).toBeInTheDocument();
  });

  it("puts the transfer button in the family-button row, same size/style, not the summary heading (Bloc 32/D.6-D.7)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const group = familyButtonsGroup();
    const transfer = within(group).getByRole("button", {
      name: "Transférer vers les Paramètres du joueur",
    });
    expect(transfer).toBeInTheDocument();
    expect(transfer.parentElement).toHaveClass("family-buttons");
    expect(transfer.parentElement).toHaveClass("stuff-family-buttons");
    expect(transfer).toHaveClass("transfer-action");
    expect(
      within(globalSummarySection()).queryByRole("button", {
        name: "Transférer vers les Paramètres du joueur",
      }),
    ).not.toBeInTheDocument();
  });

  it("right-aligns the transfer button in a distinct violet accent, not the neutral family-button style (Bloc 33/H)", () => {
    renderTool(<StuffSimulator combatRows={combatRows} />);
    const group = familyButtonsGroup();
    const buttons = within(group).getAllByRole("button");
    const transfer = buttons[buttons.length - 1];
    expect(transfer).toHaveTextContent(
      "Transférer vers les Paramètres du joueur",
    );
    expect(transfer).toHaveClass("transfer-action");
    // Family buttons carry --pill-color for their semantic accent; the
    // transfer button gets its violet purely from the dedicated class.
    expect(transfer.style.getPropertyValue("--pill-color")).toBe("");
  });

  it("highlights the transfer button on click, on top of the text confirmation, then clears both within 5s (Bloc 33/H+K)", () => {
    vi.useFakeTimers();
    try {
      renderTool(<StuffSimulator combatRows={combatRows} />);
      const transfer = within(familyButtonsGroup()).getByRole("button", {
        name: "Transférer vers les Paramètres du joueur",
      });
      expect(transfer).not.toHaveClass("transfer-action-active");
      fireEvent.click(transfer);
      expect(transfer).toHaveClass("transfer-action-active");
      expect(
        screen.getByText("Transféré dans les Paramètres du joueur !"),
      ).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(transfer).not.toHaveClass("transfer-action-active");
      expect(
        screen.queryByText("Transféré dans les Paramètres du joueur !"),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("links the active cell's config panel to it via a shared active class", () => {
    const { container } = renderTool(
      <StuffSimulator combatRows={combatRows} />,
    );
    const panel = container.querySelector(".stuff-editor-panel")!;
    expect(panel).not.toHaveClass("stuff-editor-panel-active");
    fireEvent.click(screen.getByRole("button", { name: /Amulette/ }));
    expect(panel).toHaveClass("stuff-editor-panel-active");
  });

  it("shows the cap and the real value in parentheses once the real value exceeds it", () => {
    renderTool(<StuffSimulator combatRows={[capTestRow("60")]} />);
    selectFamily("Défense");
    const defenseAmulet = screen.getByRole("button", { name: /Amulette/ });
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

  it("prioritizes the selected slot's own contribution over the cap-overflow value when they differ (Codex P2 on Bloc 32/D.5)", () => {
    // 2 different slots each contributing 30% Récupération: the sum (60%)
    // exceeds the 50% cap, but the currently selected slot (Amulette) only
    // contributes 30% itself — D.5 requires that per-slot figure, not the
    // uncapped total, once a slot is selected.
    renderTool(
      <StuffSimulator
        combatRows={[capTestRow("30", "Amulette"), capTestRow("30", "Casque")]}
      />,
    );
    selectFamily("Défense");
    fireEvent.click(screen.getByRole("button", { name: /Casque/ }));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Casque" }),
      { target: { value: "Commun|Cap Test" } },
    );
    const defenseAmulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    // Amulette (30%) is the slot currently selected; total is 60%, capped
    // to 50%.
    const box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    expect(box).toHaveTextContent("+50%");
    expect(box).toHaveTextContent("(30%)");
    expect(box).not.toHaveTextContent("(60%)");
  });

  it("shows the real value alone, with no parentheses, once nothing is selected and the value stays under the cap", () => {
    renderTool(<StuffSimulator combatRows={[capTestRow("30")]} />);
    selectFamily("Défense");
    const defenseAmulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    // Close the slot's panel again — with nothing selected, the global
    // summary has no per-slot contribution left to show.
    fireEvent.click(defenseAmulet);
    const box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    expect(box).toHaveTextContent("+30%");
    expect(box.querySelector("small")).toBeNull();
  });

  it("shows the selected slot's own contribution in parentheses, to the right of the total on the same line (Bloc 32/D.5)", () => {
    renderTool(<StuffSimulator combatRows={[capTestRow("60")]} />);
    selectFamily("Défense");
    const defenseAmulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    const box = within(globalSummarySection())
      .getByText("Récupération")
      .closest(".stuff-total")!;
    const value = box.querySelector("strong.value")!;
    const small = value.querySelector("small")!;
    // The parenthesised contribution is a child of the same <strong> line
    // as the total, not a separately positioned block sibling.
    expect(value.contains(small)).toBe(true);
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
    selectFamily("Défense");
    const defenseAmulet = screen.getByRole("button", { name: /Amulette/ });
    fireEvent.click(defenseAmulet);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Équipement Défense Amulette" }),
      { target: { value: "Commun|Cap Test" } },
    );
    fireEvent.click(
      within(familyButtonsGroup()).getByRole("button", {
        name: "Transférer vers les Paramètres du joueur",
      }),
    );
    expect(
      screen.getByText("Transféré dans les Paramètres du joueur !"),
    ).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(playerStorageKey)!);
    expect(saved.equipmentSkills.cautious).toBe(30);
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
    const summary = globalSummarySection();
    expect(within(summary).getAllByText("+0%").length).toBe(10);
    fireEvent.click(
      within(familyButtonsGroup()).getByRole("button", {
        name: "Transférer vers les Paramètres du joueur",
      }),
    );
    const saved = JSON.parse(localStorage.getItem(playerStorageKey)!);
    expect(saved.equipmentSkills.striker).toBe(0);
  });
});
