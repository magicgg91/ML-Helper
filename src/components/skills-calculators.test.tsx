import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import messages from "../../messages/fr.json";
import { SkillsCalculators } from "./skills-calculators";
import { templarCosts } from "../lib/gems-templars";

function renderWithIntl(node: ReactNode) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("SkillsCalculators", () => {
  afterEach(cleanup);
  it("caps mixed optimization rows at the available socket count", () => {
    renderWithIntl(<SkillsCalculators />);
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
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
    renderWithIntl(<SkillsCalculators />);
    fireEvent.click(screen.getByRole("tab", { name: "Gemmes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Budget disponible" }));
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
  });
  it("keeps the five Templar types independent", () => {
    renderWithIntl(<SkillsCalculators />);
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau Templier cible" }),
      { target: { value: "3" } },
    );
    expect(screen.getByTestId("templar-cost")).toHaveTextContent("599 Pouciel");
    fireEvent.click(screen.getByRole("button", { name: "Défense" }));
    expect(
      screen.getByRole("spinbutton", { name: "Niveau Templier cible" }),
    ).toHaveValue(1);
  });
  it("uses the administrator-provided Templar lookup table", () => {
    const costs = [999, ...templarCosts.slice(1)];
    renderWithIntl(<SkillsCalculators templarCostTable={costs} />);
    fireEvent.click(screen.getByRole("tab", { name: "Templiers" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Niveau Templier cible" }),
      { target: { value: "3" } },
    );
    expect(screen.getByTestId("templar-cost")).toHaveTextContent(
      "1.45k Pouciel",
    );
  });
});
