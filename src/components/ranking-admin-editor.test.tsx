import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultRankingConfig } from "../lib/ranking";
import { RankingAdminEditor } from "./ranking-admin-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RankingAdminEditor", () => {
  it("edits rows via named selects instead of a free-form target/reward string", () => {
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    expect(
      screen.queryByRole("textbox", { name: "Configuration Ranking" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Argent ligne 1 Mouvement")).toHaveValue(
      "promotion",
    );
    expect(screen.getByLabelText("Argent ligne 1 Ligue cible")).toHaveValue(
      "gold",
    );
    expect(screen.getByLabelText("Argent ligne 1 Saphirs")).toHaveValue(100);
    expect(screen.getByLabelText("Argent ligne 1 Speedups")).toHaveValue(7);
    expect(screen.getByLabelText("Argent ligne 1 Gemmes")).toHaveValue(6);
  });

  it("leaves an unconfirmed row's movement/league as the not-confirmed option", () => {
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    expect(screen.getByLabelText("Platine ligne 1 Mouvement")).toHaveValue("");
    expect(screen.getByLabelText("Platine ligne 1 Ligue cible")).toHaveValue(
      "",
    );
  });

  it("saves a structured payload with typed rewards", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    fireEvent.change(screen.getByLabelText("Diamant ligne 1 Gemmes"), {
      target: { value: "9" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.diamond[0]).toEqual({
      threshold: 1,
      movement: "promotion",
      league: "legend",
      rewards: [{ type: "gems", quantity: 9 }],
    });
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

  it("reports a movement/league pairing error distinctly from the threshold error", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    fireEvent.change(screen.getByLabelText("Platine ligne 1 Mouvement"), {
      target: { value: "promotion" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(
      screen.getAllByText(
        "Mouvement et ligue cible doivent être confirmés ensemble.",
      ),
    ).toHaveLength(2);
    expect(
      screen.queryByText("Entre 0 et 100 requis."),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Bloc35 9.1: narrows the numeric value columns to what they actually contain", () => {
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    expect(
      screen.getByLabelText("Argent ligne 1 Seuil (%)").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Saphirs").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Speedups").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Gemmes").closest("td"),
    ).toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Mouvement").closest("td"),
    ).not.toHaveClass("reference-admin-narrow");
    expect(
      screen.getByLabelText("Argent ligne 1 Ligue cible").closest("td"),
    ).not.toHaveClass("reference-admin-narrow");
  });

  it("rejects a fractional reward quantity", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    fireEvent.change(screen.getByLabelText("Argent ligne 1 Gemmes"), {
      target: { value: "1.5" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(screen.getByText("Nombre entier requis.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
