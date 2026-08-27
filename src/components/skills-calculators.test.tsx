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

  it("renames the Combat equipment tabs to distinguish them from Expedition, in FR and EN", () => {
    renderWithIntl(
      <SkillsCalculators combatRows={combatRows} expeditionRows={expeditionRows} />,
    );
    expect(
      screen.getByRole("tab", { name: "Simulateur d’Équipement de Combat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Comparateur d’Équipement de Combat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Simulateur d’Équipement d’Expédition" }),
    ).toBeInTheDocument();
    cleanup();

    renderWithIntl(
      <SkillsCalculators combatRows={combatRows} expeditionRows={expeditionRows} />,
      "en",
      enMessages,
    );
    expect(
      screen.getByRole("tab", { name: "Combat Equipment Simulator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Combat Equipment Comparator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Expedition Equipment Simulator" }),
    ).toBeInTheDocument();
  });
  it("caps mixed optimization rows at the available socket count", () => {
    renderWithIntl(<SkillsCalculators combatRows={combatRows} expeditionRows={expeditionRows} />);
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
    renderWithIntl(<SkillsCalculators combatRows={combatRows} expeditionRows={expeditionRows} />);
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
    renderWithIntl(<SkillsCalculators combatRows={combatRows} expeditionRows={expeditionRows} />);
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau cible" }),
      { target: { value: "3" } },
    );
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
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau cible" }),
      { target: { value: "3" } },
    );
    expect(screen.getByTestId("templar-cost")).toHaveTextContent(
      "3.99k Pouciel",
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
