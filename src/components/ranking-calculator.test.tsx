import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import frMessages from "../../messages/fr.json";
import enMessages from "../../messages/en.json";
import { defaultRankingConfig } from "../lib/ranking";
import { RankingCalculator } from "./ranking-calculator";

describe("RankingCalculator", () => {
  afterEach(cleanup);
  const renderCalculator = (
    locale: "fr" | "en" = "fr",
    messages: typeof frMessages | typeof enMessages = frMessages,
  ) =>
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RankingCalculator config={defaultRankingConfig} />
      </NextIntlClientProvider>,
    );
  it("converts correlated rank and percentage and renders confirmed rewards", () => {
    renderCalculator();
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "diamond" },
    });
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("1 000");
    expect(
      screen.getAllByText("Montée Légende", { selector: "td" }),
    ).toHaveLength(2);
    expect(
      screen.getByText("6 gemmes", { selector: "td" }),
    ).toBeInTheDocument();
  });
  it("joins multiple typed rewards into one localized list", () => {
    renderCalculator();
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "silver" },
    });
    expect(
      screen.getByText("100 saphirs, 7 speedup, 6 gemmes", { selector: "td" }),
    ).toBeInTheDocument();
  });
  it("renders the target league and rewards translated in English", () => {
    renderCalculator("en", enMessages);
    fireEvent.change(screen.getByLabelText("League"), {
      target: { value: "diamond" },
    });
    expect(
      screen.getAllByText("Promotion to Legend", { selector: "td" }),
    ).toHaveLength(2);
    expect(
      screen.getByText("6 gems", { selector: "td" }),
    ).toBeInTheDocument();
  });
  it("shows the editable placeholder for an unknown league", () => {
    renderCalculator();
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "bronze" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "à définir dans l’administration",
    );
  });
  it("handles a zero percentage without dividing by zero", () => {
    renderCalculator();
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "diamond" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Ton pourcentage actuel" }),
      { target: { value: "0" } },
    );
    expect(screen.getByTestId("ranking-total")).toHaveTextContent("—");
  });

  it("waits for a league instead of calculating with a default", () => {
    renderCalculator();
    expect(screen.getByLabelText("Ligue")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Choisis une ligue");
  });

  it("shows the exact-position indicator and alternates labels above/below", () => {
    const { container } = renderCalculator();
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "diamond" },
    });
    const line = screen.getByTestId("ranking-scale-player-line");
    expect(line).toHaveAttribute("data-pct", "1%");
    expect(line).toHaveStyle({ left: "99%" });

    const labels = Array.from(
      container.querySelectorAll(".ranking-scale-label"),
    );
    expect(labels.map((label) => label.className)).toEqual([
      "ranking-scale-label ranking-scale-label-above",
      "ranking-scale-label ranking-scale-label-below",
      "ranking-scale-label ranking-scale-label-above",
      "ranking-scale-label ranking-scale-label-below",
      "ranking-scale-label ranking-scale-label-above",
    ]);
  });

  it("colors each segment light-to-dark within its Montée/Maintien/Descente category", () => {
    const { container } = renderCalculator();
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "diamond" },
    });
    const segments = Array.from(
      container.querySelectorAll(".ranking-scale-segment"),
    );
    expect(
      segments.map((segment) => (segment as HTMLElement).style.background),
    ).toEqual([
      "rgba(168, 220, 184, 0.8)",
      "rgba(126, 201, 154, 0.8)",
      "rgba(168, 201, 232, 0.8)",
      "rgba(126, 171, 217, 0.8)",
      "rgba(240, 176, 136, 0.8)",
    ]);
  });
});
