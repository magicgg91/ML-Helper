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
  it("keeps the expedition fallback visibly unconfirmed", () => {
    renderTables();
    fireEvent.click(
      screen.getByRole("tab", { name: "Équipement d’Expédition" }),
    );
    expect(screen.getByText(/projection par étoile est une/)).toHaveTextContent(
      "hypothèse non confirmée",
    );
    expect(
      screen.getAllByText("Hypothèse non confirmée").length,
    ).toBeGreaterThan(0);
  });
});
