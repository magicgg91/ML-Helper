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

  // Bloc 68/C: reverts a prior Codex-driven change that made these 2
  // fields read-only/computed — the porteur de projet confirmed editable
  // Base Temple/Bonus was the intended Bloc 66 spec all along.
  it("Bloc68/C: Base Temple and Bonus are editable, not read-only", () => {
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    expect(screen.getByLabelText("Base Temple 5")).not.toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("Bonus (%) 5")).not.toHaveAttribute(
      "readonly",
    );
    fireEvent.change(screen.getByLabelText("Base Temple 5"), {
      target: { value: "75" },
    });
    expect(screen.getByLabelText("Base Temple 5")).toHaveValue(75);
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
    // Bloc 68/C: Base Temple/Bonus are editable again — persisted like
    // every other field on the row.
    expect(body.striker.temple_base).toBe(
      defaultTemplarPresentationCatalog.striker.temple_base,
    );
    expect(body.striker.bonus).toBe(
      defaultTemplarPresentationCatalog.striker.bonus,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Référentiel enregistré.",
    );
  });

  // Bloc 68/C: an admin can genuinely edit and persist Base Temple/Bonus —
  // verified for all 5 Templiers, not just one.
  it("Bloc68/C: edits to Base Temple/Bonus are included in the saved payload for all 5 templars", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <TemplarsPresentationEditor
        initialCatalog={defaultTemplarPresentationCatalog}
      />,
    );
    for (let row = 1; row <= 5; row += 1) {
      fireEvent.change(screen.getByLabelText(`Base Temple ${row}`), {
        target: { value: String(10 + row) },
      });
      fireEvent.change(screen.getByLabelText(`Bonus (%) ${row}`), {
        target: { value: String(row) },
      });
    }
    fireEvent.click(saveButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const keys = ["striker", "guardian", "prosperous", "recruiter", "rusher"];
    keys.forEach((key, index) => {
      expect(body[key].temple_base).toBe(String(11 + index));
      expect(body[key].bonus).toBe(String(1 + index));
    });
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
