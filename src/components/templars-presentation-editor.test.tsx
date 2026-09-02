import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplarsPresentationEditor } from "./templars-presentation-editor";
import { renderWithIntl as render } from "../test/render-with-intl";
import { defaultTemplarPresentationCatalog } from "../lib/templars-presentation";

function saveButton() {
  return screen.getByRole("button", { name: "Enregistrer toute la page" });
}

afterEach(cleanup);

// Bloc 66/B: same admin pattern as Boutique (a simple table), but the 5
// Templiers are a fixed, complete set — no add/move/remove controls.
describe("TemplarsPresentationEditor", () => {
  it("renders exactly 5 fixed rows with no add/move/remove controls", () => {
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    expect(screen.getAllByLabelText(/^Nom \d$/)).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /Ajouter/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Monter/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Descendre/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Supprimer/ })).toBeNull();
  });

  it("shows Image, Nom, Description, Base Temple and Bonus columns", () => {
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Chemin de l’image" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Nom" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Description" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Base Temple" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Bonus (%)" }),
    ).toBeInTheDocument();
  });

  // The 5 rows are seeded from the already-confirmed competence
  // names/templeBase/templarRates constants (fr by default).
  it("seeds the 5 rows from the already-confirmed competence names and base values", () => {
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    expect(screen.getByLabelText("Nom 1")).toHaveValue("Attaque");
    expect(screen.getByLabelText("Nom 5")).toHaveValue("Vitesse");
    expect(screen.getByLabelText("Base Temple 5")).toHaveValue(50);
    expect(screen.getByLabelText("Bonus (%) 5")).toHaveValue(1);
  });

  // Codex review (PR #85): a separately-editable copy of these 2 values
  // could drift from the templeBase/templarRates constants the real
  // calculators read — they're shown for visibility only, computed
  // straight from those constants, never editable here.
  it("Codex review (PR#85): Base Temple/Bonus are read-only, computed from the real game constants", () => {
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    expect(screen.getByLabelText("Base Temple 5")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("Bonus (%) 5")).toHaveAttribute("readonly");
  });

  // The locale toggle switches which language's Nom/Description columns
  // are being edited, same as Boutique's own admin editor.
  it("switches the Nom/Description columns to English via the locale selector", () => {
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    fireEvent.change(screen.getByLabelText("Langue du texte"), {
      target: { value: "en" },
    });
    expect(screen.getByLabelText("Nom 1")).toHaveValue("Attack");
  });

  it("saves the whole 5-row catalog, keyed by technical Templar key, in one PUT request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nom 1"), {
      target: { value: "Attaque modifiée" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/guides/references/templars");
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(String(init?.body));
    expect(Object.keys(body)).toEqual([
      "striker",
      "guardian",
      "prosperous",
      "recruiter",
      "rusher",
    ]);
    expect(body.striker.name_fr).toBe("Attaque modifiée");
    // Codex review (PR #85): the read-only Base Temple/Bonus columns are
    // never part of the saved payload — there is nothing to drift out of
    // sync with the real templeBase/templarRates constants.
    expect(body.striker).not.toHaveProperty("temple_base");
    expect(body.striker).not.toHaveProperty("bonus");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Référentiel enregistré.",
    );
  });

  it("blocks saving when Nom is emptied, without calling fetch", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nom 1"), {
      target: { value: "" },
    });
    fireEvent.click(saveButton());
    expect(
      screen.getByText("Corrige les champs signalés avant l’enregistrement."),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
