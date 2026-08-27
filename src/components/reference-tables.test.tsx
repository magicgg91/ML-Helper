import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import { ReferenceTables } from "./reference-tables";
import {
  combatReferenceRows,
  expeditionReferenceRows,
} from "../lib/reference-equipment";

describe("ReferenceTables", () => {
  afterEach(cleanup);
  const renderTables = () =>
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceTables
          combatRows={combatReferenceRows}
          expeditionRows={expeditionReferenceRows}
        />
      </NextIntlClientProvider>,
    );

  it("filters combat equipment and applies additive stars", () => {
    renderTables();
    fireEvent.click(screen.getByRole("button", { name: "Attaque" }));
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Recherche libre" }),
      { target: { value: "Spirit Fyra" } },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Niveau d’étoile" }),
      { target: { value: "5" } },
    );
    expect(screen.getByText("9 lignes — valeurs à 5★")).toBeInTheDocument();
    expect(screen.getAllByText("18%").length).toBeGreaterThan(0);
  });
  it("attempts the manifest image path for each combat equipment row", () => {
    renderTables();
    fireEvent.click(screen.getByRole("button", { name: "Attaque" }));
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Recherche libre" }),
      { target: { value: "Spirit Fyra" } },
    );
    const images = document.querySelectorAll<HTMLImageElement>(
      ".reference-equipment-image",
    );
    expect(images.length).toBe(9);
    expect(
      Array.from(images).map((image) => image.getAttribute("src")),
    ).toContain("/equipment/combat/attack-legendary-weapon.webp");
  });

  it("attempts the manifest image path for each expedition equipment row", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipement d’Expédition" }),
    );
    const image = document.querySelector<HTMLImageElement>(
      ".reference-equipment-image",
    )!;
    expect(image.getAttribute("src")).toMatch(
      /^\/equipment\/expedition\/[a-z-]+-(common|rare|epic|mythic|legendary)-[a-z-]+\.webp$/,
    );
  });

  it("no longer shows the stale unconfirmed-assumption banner now that all 10 stats are confirmed", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipement d’Expédition" }),
    );
    expect(
      screen.queryByText(/projection par étoile est une/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Hypothèse non confirmée")).not.toBeInTheDocument();
  });
});
