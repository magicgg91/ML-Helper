import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumablesReferenceScreen } from "./consumables-admin-editor";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableRow } from "../lib/consumables";

const rowA: ConsumableRow = {
  image: "/consumables/a.webp",
  name_fr: "Objet A",
  name_en: "Item A",
  description_fr: "Description A",
  description_en: "Description A EN",
  cost: "100",
};
const rowB: ConsumableRow = {
  image: "/consumables/b.webp",
  name_fr: "Objet B",
  name_en: "Item B",
  description_fr: "Description B",
  description_en: "Description B EN",
  cost: "",
};

function renderScreen() {
  return render(
    <ConsumablesReferenceScreen
      initialRows={[rowA, rowB]}
      introInitial={{
        fr: "## Intro FR",
        en: "## Intro EN",
        de: "",
        es: "",
        tr: "",
      }}
    />,
  );
}

describe("ConsumablesReferenceScreen", () => {
  afterEach(cleanup);
  beforeEach(() => vi.restoreAllMocks());

  it("shows one back link, both save buttons and the two starting rows in order", () => {
    renderScreen();
    expect(screen.getAllByRole("link", { name: "← Retour" })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Enregistrer l’introduction" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enregistrer les objets" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ligne 1 Nom (FR)")).toHaveValue("Objet A");
    expect(screen.getByLabelText("Ligne 2 Nom (FR)")).toHaveValue("Objet B");
  });

  it("adds a free-form empty row at the end", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un objet" }));
    expect(screen.getByLabelText("Ligne 3 Nom (FR)")).toHaveValue("");
    expect(screen.getByLabelText("Ligne 3 Coût (Saphirs)")).toHaveValue(null);
  });

  it("removes a row by its own row-scoped button", () => {
    renderScreen();
    fireEvent.click(screen.getAllByRole("button", { name: "Supprimer" })[0]);
    expect(screen.queryByLabelText("Ligne 2 Nom (FR)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ligne 1 Nom (FR)")).toHaveValue("Objet B");
  });

  it("moves a row down/up by exactly 1 position, disabled at the boundaries", () => {
    renderScreen();
    const moveUpButtons = screen.getAllByRole("button", { name: "Monter" });
    const moveDownButtons = screen.getAllByRole("button", {
      name: "Descendre",
    });
    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveDownButtons[1]).toBeDisabled();

    fireEvent.click(moveDownButtons[0]);
    expect(screen.getByLabelText("Ligne 1 Nom (FR)")).toHaveValue("Objet B");
    expect(screen.getByLabelText("Ligne 2 Nom (FR)")).toHaveValue("Objet A");
  });

  it("saves the rows as-is (order = display order) via PUT, distinct from the intro's endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    renderScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les objets" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/guides/references/consumables");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual([rowA, rowB]);
  });

  it("blocks saving the rows when a required field is emptied, without calling fetch", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderScreen();
    fireEvent.change(screen.getByLabelText("Ligne 1 Nom (FR)"), {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les objets" }),
    );
    expect(
      screen.getByText("Corrige les champs signalés avant l’enregistrement."),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves the FR/EN intro markdown via its own PATCH endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    renderScreen();
    const editor = screen.getByLabelText("Introduction (markdown)");
    expect(editor).toHaveValue("## Intro FR");
    fireEvent.change(editor, { target: { value: "## Nouvelle intro" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’introduction" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/content/consumables-intro");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      content: {
        fr: "## Nouvelle intro",
        en: "## Intro EN",
        de: "",
        es: "",
        tr: "",
      },
    });
  });
});
