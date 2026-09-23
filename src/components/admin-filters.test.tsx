import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterChips, SearchInput } from "./admin-filters";

afterEach(cleanup);

const chips = [
  { value: "all", label: "Toutes", count: 12 },
  { value: "ranking", label: "Classement", count: 1 },
  { value: "cities", label: "Villes", count: 4 },
] as const;

describe("Bloc 119: FilterChips", () => {
  it("presses exactly the selected chip", () => {
    render(
      <FilterChips
        label="Catégorie"
        chips={chips}
        value="cities"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Villes/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Toutes/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("names the group once instead of every chip", () => {
    render(
      <FilterChips
        label="Catégorie"
        chips={chips}
        value="all"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("group", { name: "Catégorie" }),
    ).toBeInTheDocument();
  });

  it("shows each chip's count", () => {
    render(
      <FilterChips
        label="Catégorie"
        chips={chips}
        value="all"
        onChange={vi.fn()}
      />,
    );
    // The count is part of the button's accessible name, so a screen reader
    // hears "Villes 4" rather than a bare number floating next to it.
    expect(
      screen.getByRole("button", { name: "Villes 4" }),
    ).toBeInTheDocument();
  });

  it("reports the chip that was chosen", () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        label="Catégorie"
        chips={chips}
        value="all"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Classement/ }));
    expect(onChange).toHaveBeenCalledWith("ranking");
  });
});

describe("Bloc 119: SearchInput", () => {
  it("has a real label, hidden from view", () => {
    render(
      <SearchInput label="Rechercher un outil" value="" onChange={vi.fn()} />,
    );
    const field = screen.getByRole("searchbox", {
      name: "Rechercher un outil",
    });
    expect(field).toBeInTheDocument();
    expect(screen.getByText("Rechercher un outil")).toHaveClass("sr-only");
  });

  it("reports what was typed", () => {
    const onChange = vi.fn();
    render(<SearchInput label="Rechercher" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ville" },
    });
    expect(onChange).toHaveBeenCalledWith("ville");
  });
});
