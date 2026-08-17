import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defaultRankingConfig } from "../lib/ranking";
import { RankingCalculator } from "./ranking-calculator";

describe("RankingCalculator", () => {
  afterEach(cleanup);
  it("converts correlated rank and percentage and renders confirmed rewards", () => {
    render(<RankingCalculator config={defaultRankingConfig} />);
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("1 000");
    expect(
      screen.getAllByText("Montée Légende", { selector: "td" }),
    ).toHaveLength(2);
    expect(
      screen.getByText("6 gemmes", { selector: "td" }),
    ).toBeInTheDocument();
  });
  it("shows the editable placeholder for an unknown league", () => {
    render(<RankingCalculator config={defaultRankingConfig} />);
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "bronze" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "à définir dans l’administration",
    );
  });
  it("handles a zero percentage without dividing by zero", () => {
    render(<RankingCalculator config={defaultRankingConfig} />);
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: "0" } },
    );
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("—");
  });
});
