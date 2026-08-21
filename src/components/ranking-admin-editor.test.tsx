import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultRankingConfig } from "../lib/ranking";
import { RankingAdminEditor } from "./ranking-admin-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RankingAdminEditor", () => {
  it("edits rows without exposing raw JSON", () => {
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    expect(
      screen.queryByRole("textbox", { name: "Configuration Ranking" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Argent ligne 1 Ligue cible")).toHaveValue(
      "Montée Or",
    );
  });

  it("shows field validation instead of failing silently", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    fireEvent.change(screen.getByLabelText("Argent ligne 1 Seuil (%)"), {
      target: { value: "101" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(screen.getByText("Entre 0 et 100 requis.")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Corrige les champs signalés",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
