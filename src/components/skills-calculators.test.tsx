import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkillsCalculators } from "./skills-calculators";

describe("SkillsCalculators", () => {
  afterEach(cleanup);
  it("caps mixed optimization rows at the available socket count", () => {
    render(<SkillsCalculators />);
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
    render(<SkillsCalculators />);
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
    render(<SkillsCalculators />);
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
});
