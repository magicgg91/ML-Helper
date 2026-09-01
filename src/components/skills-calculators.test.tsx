import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import { SkillsCalculators } from "./skills-calculators";
import {
  combatEquipmentData,
  expeditionEquipmentData,
} from "../lib/equipment-data";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
} from "../lib/reference-equipment";
import { defaultGemParameters } from "../lib/gem-parameters";

const combatRows = combatEquipmentData as readonly CombatReferenceRow[];
const expeditionRows =
  expeditionEquipmentData as readonly ExpeditionReferenceRow[];

function renderWithIntl(
  node: ReactNode,
  locale: "fr" | "en" = "fr",
  localeMessages: typeof frMessages | typeof enMessages = frMessages,
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("SkillsCalculators", () => {
  afterEach(cleanup);

  it("labels the tabs plainly (Bloc 31/A) in the Combat, Expedition, Gems, Templars order (Bloc 31/C), with no Comparator (Bloc 31/B)", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Équipement de Combat",
      "Équipements d’Expédition",
      "Gemmes",
      "Templiers",
    ]);
    expect(
      screen.queryByRole("tab", { name: /Comparateur/ }),
    ).not.toBeInTheDocument();
    cleanup();

    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
      "en",
      enMessages,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Combat Equipment",
      "Expedition Equipment",
      "Gems",
      "Templars",
    ]);
    expect(
      screen.queryByRole("tab", { name: /Comparator/ }),
    ).not.toBeInTheDocument();
  });
  it("colors the Gems family buttons to match the equivalent Combat equipment/skill colors (Bloc 31/H)", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    const attack = screen.getByRole("button", { name: "Attaque" });
    expect(attack.style.getPropertyValue("--pill-color")).toBe("#c0392b");
    const gold = screen.getByRole("button", { name: "Or" });
    expect(gold.style.getPropertyValue("--pill-color")).toBe("var(--amber)");
  });
  it("caps mixed optimization rows at the available socket count", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    expect(screen.getByRole("combobox", { name: "Ligue ligne 1" })).toHaveValue(
      "",
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 1" }),
      { target: { value: "25" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une stat" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 2" }),
      { target: { value: "10" } },
    );
    expect(screen.getByTestId("gem-allocated")).toHaveTextContent("27");
    expect(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 2" }),
    ).toHaveValue(2);
  });
  it("shows the budget distribution as the primary result", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Budget disponible" }));
    const league = screen.getByRole("combobox", { name: "Ligue" });
    expect(league).toHaveValue("");
    fireEvent.change(league, { target: { value: "legend" } });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements budget" }),
      { target: { value: "3" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Budget disponible en saphirs" }),
      { target: { value: "112000" } },
    );
    expect(screen.getByTestId("gem-budget-distribution")).toHaveTextContent(
      "1 gemme 4★ + 2 gemmes 3★",
    );
    const obtainedStat = screen
      .getByText("Stat obtenue")
      .closest(".calculator-stat")!
      .querySelector("strong")!;
    expect(obtainedStat).toHaveClass("value", "emerald");
  });
  it("applies one shared level range to all five Templar skills at once", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Niveau cible" }), {
      target: { value: "3" },
    });
    expect(screen.getByTestId("templar-cost")).toHaveTextContent("599 Pouciel");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    const striker = rows
      .find((row) => row.textContent?.startsWith("Attaque"))!
      .querySelectorAll("td");
    expect(striker[1]).toHaveTextContent("0.25%/Templier");
    expect(striker[2]).toHaveTextContent("0.75%");
    expect(striker[3]).toHaveTextContent("+0.75%");
    const rusher = rows
      .find((row) => row.textContent?.startsWith("Vitesse"))!
      .querySelectorAll("td");
    expect(rusher[1]).toHaveTextContent("1%/Templier");
    expect(rusher[2]).toHaveTextContent("3%");
    expect(rusher[3]).toHaveTextContent("+3%");
  });
  it("uses the administrator-provided named Templar parameters", () => {
    renderWithIntl(
      <SkillsCalculators
        templarParameters={{ base: 999, ratio: 1.3 }}
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Niveau cible" }), {
      target: { value: "3" },
    });
    expect(screen.getByTestId("templar-cost")).toHaveTextContent(
      "3.99k Pouciel",
    );
  });
  // Bloc 53/F: a reference's cross-link (Gems, Templars) now passes
  // ?open=<tab>, read server-side and forwarded here as initialTool — this
  // must select the precise tab instead of always defaulting to whichever
  // tab is firstAvailable.
  it("Bloc53/F: initialTool selects the given tab directly, instead of defaulting to the first available one", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        initialTool="templars"
      />,
    );
    expect(screen.getByRole("tab", { name: "Templiers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  // Bloc 54/A: the newly-added Combat/Expedition reference->tool links pass
  // ?open=simulator / ?open=expedition — must select those tabs too, same
  // mechanism already proven for gems/templars above.
  it('Bloc54/A: initialTool="simulator" selects the Équipement de Combat tab', () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        initialTool="simulator"
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Équipement de Combat" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it('Bloc54/A: initialTool="expedition" selects the Équipements d’Expédition tab', () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        initialTool="expedition"
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Équipements d’Expédition" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("Bloc53/F: falls back to the first available tab when initialTool's calculator is unavailable", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        availability={{
          simulator: true,
          expedition: true,
          gems: false,
          templars: true,
        }}
        initialTool="gems"
      />,
    );
    expect(
      screen.getByRole("tab", { name: "Équipement de Combat" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  // Bloc 53/E: the plain "Voir le référentiel complet" link is now a
  // centered banner + mini-card, with a label adapted to the link's
  // direction (here, tool -> reference).
  it("Bloc53/E: shows the tool->reference banner with the direction-adapted label and the destination reference's title", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    expect(
      screen.getByText("Aller plus loin en vérifiant le référentiel"),
    ).toBeInTheDocument();
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(screen.getByRole("link", { name: /Gemmes$/ })).toHaveAttribute(
      "href",
      "/referentiels/gems",
    );
  });

  it("uses the administrator-provided named Gem parameters", () => {
    renderWithIntl(
      <SkillsCalculators
        combatRows={combatRows}
        expeditionRows={expeditionRows}
        gemParameters={{
          ...defaultGemParameters,
          gemPrice: { ...defaultGemParameters.gemPrice, legend: 5000 },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Ligue ligne 1" }), {
      target: { value: "legend" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Emplacements ligne 1" }),
      { target: { value: "5" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Stat cible ligne 1" }),
      { target: { value: "10" } },
    );
    // striker factor 1 × legend factor 6 = value 6; round(10 / 6) = 2 gems.
    // At the default 7000/gem this would show 14k — the overridden 5000
    // price must be the one actually used, giving 10k instead.
    expect(screen.getAllByText("10k").length).toBeGreaterThan(0);
    expect(screen.queryByText("14k")).not.toBeInTheDocument();
  });
});
