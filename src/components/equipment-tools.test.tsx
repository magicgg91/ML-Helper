import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StuffComparison, StuffSimulator } from "./equipment-tools";
import { NextIntlClientProvider } from "next-intl";

function renderTool(tool: React.ReactNode) {
  return render(
    <NextIntlClientProvider
      locale="fr"
      messages={{ References: { viewFull: "Voir le référentiel complet" } }}
    >
      {tool}
    </NextIntlClientProvider>,
  );
}

describe("equipment tools", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("toggles a simulator slot and persists an exact set", async () => {
    renderTool(<StuffSimulator />);
    expect(
      screen.getByRole("link", { name: "Voir le référentiel complet" }),
    ).toHaveAttribute("href", "/guides/referentiels/combat-equipment");
    const amulet = screen.getAllByRole("button", { name: /Amulette/ })[0];
    fireEvent.click(amulet);
    const select = screen.getByRole("combobox", {
      name: "Équipement Attaque Amulette",
    });
    expect(select.querySelectorAll("option")[1]).toHaveTextContent(
      /Légendaire.*Attaque/,
    );
    fireEvent.change(select, { target: { value: "Légendaire|Spirit Fyra" } });
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

  it("compares explicit sets and colors a positive difference", () => {
    renderTool(<StuffComparison />);
    expect(
      screen.getByRole("link", { name: "Voir le référentiel complet" }),
    ).toHaveAttribute("href", "/guides/referentiels/combat-equipment");
    const [a, b] = screen.getAllByRole("combobox", {
      name: /Équipement Attaque Amulette/,
    });
    fireEvent.change(a, { target: { value: "Commun|Barbarian" } });
    fireEvent.change(b, { target: { value: "Légendaire|Spirit Fyra" } });
    const attackRow = screen
      .getByRole("cell", { name: "Attaque" })
      .closest("tr")!;
    expect(attackRow.querySelector(".diff-positive")).toBeTruthy();
  });
});
