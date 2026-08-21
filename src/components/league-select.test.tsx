import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueSelect } from "./league-select";
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
