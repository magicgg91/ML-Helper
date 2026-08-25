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
      "montee",
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
    expect(screen.getByLabelText("Platine ligne 1 Ligue cible")).toHaveValue("");
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
      movement: "montee",
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

  it("rejects a row with only a movement or only a target league set", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<RankingAdminEditor initialConfig={defaultRankingConfig} />);
    fireEvent.change(screen.getByLabelText("Platine ligne 1 Mouvement"), {
      target: { value: "montee" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le classement" }),
    );
    expect(screen.getByText("Entre 0 et 100 requis.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
