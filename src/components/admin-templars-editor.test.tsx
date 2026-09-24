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
    expect(body.presentation.striker.name_fr).toBe("Frappe");
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
    expect(screen.getByLabelText("Nom de Attaque")).toHaveValue("Attack");
    fireEvent.change(screen.getByLabelText("Nom de Attaque"), {
      target: { value: "Strike" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.presentation.striker).toMatchObject({
      name_fr: "Frappe",
      name_en: "Strike",
    });
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
