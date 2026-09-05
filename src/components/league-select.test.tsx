import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueButtons, LeagueSelect } from "./league-select";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
});

describe("LeagueSelect", () => {
  it("starts on the placeholder and lists every league in order", () => {
    render(<LeagueSelect label="Ligue" value="" onChange={vi.fn()} />);
    const select = screen.getByLabelText("Ligue") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(
      Array.from(select.options).map((option) => option.textContent),
    ).toEqual([
      "— Choisir —",
      "Bronze",
      "Argent",
      "Or",
      "Platine",
      "Diamant",
      "Légende",
    ]);
  });

  it("reports the selected league", () => {
    const onChange = vi.fn();
    render(<LeagueSelect label="Ligue" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Ligue"), {
      target: { value: "diamond" },
    });
    expect(onChange).toHaveBeenCalledWith("diamond");
  });
});

// Bloc 61: single-select league picker sharing the same button-group
// pattern as the equipment family filters (.family-buttons, role="group",
// aria-pressed) instead of a <select>.
describe("LeagueButtons", () => {
  afterEach(cleanup);

  it("lists every league as a button, in order, none pressed with no value", () => {
    render(<LeagueButtons label="Ligue" value="" onChange={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Ligue" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Bronze",
      "Argent",
      "Or",
      "Platine",
      "Diamant",
      "Légende",
    ]);
    for (const button of buttons)
      expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("marks only the current value as pressed", () => {
    render(<LeagueButtons label="Ligue" value="gold" onChange={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Ligue" });
    expect(within(group).getByRole("button", { name: "Or" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(group).getByRole("button", { name: "Bronze" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the clicked league — single-select, not cumulative", () => {
    const onChange = vi.fn();
    render(<LeagueButtons label="Ligue" value="bronze" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Diamant" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("diamond");
  });

  it("uses the same .family-buttons pattern as the equipment family filters", () => {
    render(<LeagueButtons label="Ligue" value="" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Ligue" })).toHaveClass(
      "family-buttons",
    );
  });

  // Bloc 68/N: an opt-in extra class (e.g. for Événements/Progression's
  // mobile 3-column grid) layers onto .family-buttons rather than
  // replacing it — every other caller that omits it is unaffected.
  it("Bloc68/N: layers an optional extra class onto .family-buttons without replacing it", () => {
    render(
      <LeagueButtons
        label="Ligue"
        value=""
        onChange={vi.fn()}
        className="league-buttons-grid"
      />,
    );
    const group = screen.getByRole("group", { name: "Ligue" });
    expect(group).toHaveClass("family-buttons");
    expect(group).toHaveClass("league-buttons-grid");
  });

  it("Bloc68/N: carries no extra class when none is given", () => {
    render(<LeagueButtons label="Ligue" value="" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Ligue" }).className).toBe(
      "family-buttons",
    );
  });
});
