import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { defaultTemplarPresentationCatalog } from "../lib/templars-presentation";
import { TemplarsEditor } from "./admin-templars-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderEditor(backHref = "/admin/tools") {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(
    <TemplarsEditor
      initialParameters={{ base: 150, ratio: 1.3 }}
      initialPresentation={structuredClone(defaultTemplarPresentationCatalog)}
      backHref={backHref}
      backLabel="Outils"
      title="Paramètres de coût des Templiers"
    />,
  );
  return request;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

describe("Bloc 119: the Templiers screen", () => {
  it("saves the cost formula and the presentation in one request", async () => {
    // §3 bis: the screen used to carry two save buttons, so half the work
    // could be stored and the other half lost.
    const request = renderEditor();
    expect(screen.getAllByRole("button", { name: /Enregistrer/ })).toHaveLength(
      1,
    );
    fireEvent.change(screen.getByLabelText("Base"), {
      target: { value: "160" },
    });
    fireEvent.change(screen.getByLabelText("Nom de Attaque"), {
      target: { value: "Frappe" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request.mock.calls[0][0]).toBe("/api/admin/tools/templars");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.parameters).toEqual({ base: 160, ratio: 1.3 });
    expect(body.presentation.striker.name).toEqual({ fr: "Frappe" });
  });

  it("computes the preview with the public tool's own function", () => {
    renderEditor();
    // templarLevelCost(level) = round(base × ratio^(level-1)); level 3 of
    // 150/1.3 is 254. Nothing here re-implements that.
    expect(screen.getByText("Niveau 3").parentElement).toHaveTextContent("254");
    fireEvent.change(screen.getByLabelText("Base"), {
      target: { value: "300" },
    });
    expect(screen.getByText("Niveau 3").parentElement).toHaveTextContent("507");
  });

  it("edits one language's texts without touching the other", async () => {
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText("Nom de Attaque"), {
      target: { value: "Frappe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    // Bloc 127 (PR 2/3) : rien n'est surchargé en anglais, donc le champ est
    // vide — et le placeholder montre le nom de compétence traduit qui fait
    // foi tant que personne n'écrit par-dessus.
    const english = screen.getByLabelText("Nom de Attaque");
    expect(english).toHaveValue("");
    expect(english).toHaveAttribute("placeholder", "Attaque");
    fireEvent.change(english, { target: { value: "Strike" } });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.presentation.striker.name).toEqual({
      fr: "Frappe",
      en: "Strike",
    });
  });

  // Bloc 127 (PR 2/3) : ce que la paire ne pouvait pas faire. Sur l'onglet DE,
  // taper un nom l'écrivait dans la colonne anglaise (Bloc 125 §9).
  it("Bloc127: writes German in German, and leaves the other languages alone", async () => {
    const request = renderEditor();
    for (const code of ["DE", "ES", "TR"])
      expect(
        screen.getByRole("button", { name: new RegExp(`^${code} — `) }),
        code,
      ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^DE — / }));
    fireEvent.change(screen.getByLabelText("Nom de Attaque"), {
      target: { value: "Angriff (Klan)" },
    });
    fireEvent.change(screen.getByLabelText("Description de Attaque"), {
      target: { value: "Auf Deutsch." },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.presentation.striker.name).toEqual({ de: "Angriff (Klan)" });
    expect(body.presentation.striker.description).toEqual({
      de: "Auf Deutsch.",
    });
    // L'onglet français reste vide : rien n'y a été écrit.
    fireEvent.click(screen.getByRole("button", { name: /^FR — / }));
    expect(screen.getByLabelText("Nom de Attaque")).toHaveValue("");
  });

  it("Bloc127: clearing a language drops it instead of saving it blank", async () => {
    const request = renderEditor();
    fireEvent.change(screen.getByLabelText("Nom de Attaque"), {
      target: { value: "Frappe" },
    });
    fireEvent.change(screen.getByLabelText("Nom de Attaque"), {
      target: { value: "" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.presentation.striker.name).toEqual({});
  });

  it("keeps the numbers out of the language switch", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Base temple de Attaque"), {
      target: { value: "42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    expect(screen.getByLabelText("Base temple de Attaque")).toHaveValue("42");
  });

  it("shows an unwritten description as one, without inventing text", () => {
    renderEditor();
    const description = screen.getByLabelText("Description de Attaque");
    fireEvent.change(description, { target: { value: "" } });
    expect(description).toHaveAttribute("placeholder", "Description à rédiger");
    expect(description.className).toContain("border-dashed");
  });

  it("opens the image path only when it is being changed", () => {
    renderEditor();
    expect(screen.queryByLabelText("Chemin de l’image de Attaque")).toBeNull();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Changer l’image" })[0],
    );
    expect(
      screen.getByLabelText("Chemin de l’image de Attaque"),
    ).toBeInTheDocument();
  });

  it("goes back where it was opened from", () => {
    renderEditor("/admin/referentiels");
    expect(screen.getByRole("link", { name: "← Outils" })).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });
});

describe("Bloc 125 §5: the preview sits beside what computes it", () => {
  it("puts Base, Ratio and the preview on one row", () => {
    renderEditor();
    const row = document.body.querySelector(
      ".lg\\:grid-cols-\\[200px_200px_minmax\\(0\\,1fr\\)\\]",
    );
    expect(row).not.toBeNull();
    // All three really are in it: the two fields and the five levels.
    expect(within(row as HTMLElement).getByLabelText("Base")).toBeVisible();
    expect(within(row as HTMLElement).getByLabelText("Ratio")).toBeVisible();
    expect(
      within(row as HTMLElement).getByText("Aperçu — coût des niveaux 1 à 5"),
    ).toBeVisible();
  });

  it("recomputes the preview from the tool's own function as the ratio changes", () => {
    renderEditor();
    const sequence = () =>
      screen.getByText("Niveau 5").closest("ol")!.textContent;
    const before = sequence();
    fireEvent.change(screen.getByLabelText("Ratio"), {
      target: { value: "2" },
    });
    expect(sequence()).not.toBe(before);
  });
});
