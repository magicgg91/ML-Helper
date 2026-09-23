import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { defaultLevelUpParameters } from "../lib/level-up";
import {
  LevelUpParametersEditor,
  TemplarParametersEditor,
} from "./named-parameters-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("named formula parameter editors", () => {
  it("exposes only the named Templar base and ratio", () => {
    render(<TemplarParametersEditor initial={{ base: 150, ratio: 1.3 }} />);
    expect(screen.getByRole("spinbutton", { name: "Base" })).toHaveValue(150);
    expect(screen.getByRole("spinbutton", { name: "Ratio" })).toHaveValue(1.3);
    expect(screen.queryByText(/JSON/i)).toBeNull();
    expect(screen.getByRole("link", { name: "← Retour" })).toHaveAttribute(
      "href",
      "/admin/tools",
    );
  });
  it("sends a guides_manager reaching this editor from Guides back to Guides, not the Outils table they can't view", () => {
    render(
      <TemplarParametersEditor
        initial={{ base: 150, ratio: 1.3 }}
        backHref="/admin/guides"
      />,
    );
    expect(screen.getByRole("link", { name: "← Retour" })).toHaveAttribute(
      "href",
      "/admin/guides",
    );
  });

  it("Bloc35 10.2/10.3: LevelUpParametersEditor uses the same EditorActionBar save banner as the other editors", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<LevelUpParametersEditor initial={defaultLevelUpParameters} />);
    expect(screen.getByRole("link", { name: /Retour/ })).toHaveClass(
      "editor-back-action",
    );
    const saveButton = screen.getByRole("button", {
      name: "Enregistrer les paramètres",
    });
    expect(saveButton).toHaveClass("editor-action-primary");
    fireEvent.click(saveButton);
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request).toHaveBeenCalledWith(
      "/api/admin/guides/references/level-up",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(await screen.findByText("Paramètres enregistrés.")).toBeVisible();
  });

  // Bloc 107/A: the reported bug was a Silver ratio that the public table
  // computed from and the admin screen disagreed with. It could survive a
  // check because this form showed what had been TYPED, never what the route
  // stored — the two are the same only when the save went through untouched.
  // The route echoes the parameters it parsed; the form now adopts them, so
  // what is on screen is what the reference computes from.
  it("Bloc107/A: shows what the route stored, not what was typed into it", async () => {
    const stored = {
      ...defaultLevelUpParameters,
      troops: {
        ...defaultLevelUpParameters.troops,
        silver: { coefficient: 32.291367, ratio: 1.243 },
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(stored), { status: 200 }),
    );
    render(<LevelUpParametersEditor initial={defaultLevelUpParameters} />);
    const ratioField = screen.getByRole("spinbutton", { name: "Argent Ratio" });
    // The neighbouring league's ratio, which is what the table was reported to
    // be using — typed here, and not what comes back.
    fireEvent.change(ratioField, { target: { value: "1.245" } });
    expect(ratioField).toHaveValue(1.245);
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(ratioField).toHaveValue(1.243));
    expect(
      screen.getByRole("spinbutton", { name: "Argent Coefficient" }),
    ).toHaveValue(32.291367);
  });

  // Bloc 107/A: a rejected save must not leave the refused values on screen
  // looking accepted — this is the half of the report where the admin and the
  // public reference drifted apart without anything saying so.
  it("Bloc107/A: keeps the refused values out of the form when the route says no", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_parameters" }), {
        status: 400,
      }),
    );
    render(<LevelUpParametersEditor initial={defaultLevelUpParameters} />);
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Argent Coefficient" }),
      { target: { value: "32.291367" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    expect(await screen.findByText(/400/)).toBeVisible();
  });

  // Bloc 42/B: Silver's troop formula is still unconfirmed, but AGENTS.md
  // requires unconfirmed data to stay admin-editable with a default value —
  // this used to be a plain "not confirmed" paragraph, no field at all.
  it("Bloc42/B: gives Silver a real, editable coefficient/ratio field instead of just a static 'unconfirmed' note", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(<LevelUpParametersEditor initial={defaultLevelUpParameters} />);
    const coefficientField = screen.getByRole("spinbutton", {
      name: "Argent Coefficient",
    });
    const ratioField = screen.getByRole("spinbutton", {
      name: "Argent Ratio",
    });
    expect(coefficientField).toHaveValue(0);
    expect(ratioField).toHaveValue(0);
    expect(screen.getByText(/Formule de troupes non confirmée/)).toBeVisible();

    fireEvent.change(coefficientField, { target: { value: "12.5" } });
    fireEvent.change(ratioField, { target: { value: "1.1" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les paramètres" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.troops.silver).toEqual({ coefficient: 12.5, ratio: 1.1 });
  });

  // Bloc 98/C: one row per league, in the game's own progression order —
  // Silver used to be a hand-written row appended after the five "confirmed"
  // ones, so it sat last, after Légende.
  it("Bloc98/C: lists every league in game progression order", () => {
    render(<LevelUpParametersEditor initial={defaultLevelUpParameters} />);
    const rows = screen.getAllByRole("row").slice(1); // drop the header row
    expect(
      rows.map((row) =>
        within(row).getAllByRole("cell")[0].textContent?.trim(),
      ),
    ).toEqual([
      "Bronze",
      expect.stringContaining("Argent"),
      "Or",
      "Platine",
      "Diamant",
      "Légende",
    ]);
  });

  // Bloc 98/B: the note stayed next to Argent for good, even once values had
  // been entered and saved. It now follows what is actually stored.
  it("Bloc98/B: drops the 'not confirmed' note once a league has values", () => {
    // The Bloc42/B test above renders the shipped defaults and finds the note
    // on Argent; the same editor, given values for Argent, must not show it —
    // it used to stay for good, whatever had been entered and saved.
    render(
      <LevelUpParametersEditor
        initial={{
          ...defaultLevelUpParameters,
          troops: {
            ...defaultLevelUpParameters.troops,
            silver: { coefficient: 30, ratio: 1.24 },
          },
        }}
      />,
    );
    expect(
      screen.getByRole("spinbutton", { name: "Argent Coefficient" }),
    ).toHaveValue(30);
    expect(screen.queryByText(/Formule de troupes non confirmée/)).toBeNull();
  });

  it("Bloc98/B: puts that note on any league left empty, not only on Argent", () => {
    render(
      <LevelUpParametersEditor
        initial={{
          ...defaultLevelUpParameters,
          troops: {
            ...defaultLevelUpParameters.troops,
            legend: { coefficient: 0, ratio: 0 },
          },
        }}
      />,
    );
    const noted = screen
      .getAllByText(/Formule de troupes non confirmée/)
      .map((note) =>
        note
          .closest("td")
          ?.textContent?.replace(/\(.*\)/, "")
          .trim(),
      );
    expect(noted).toEqual(["Argent", "Légende"]);
  });
});
