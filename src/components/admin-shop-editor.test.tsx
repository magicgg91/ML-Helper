import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import type { ConsumableCatalog } from "../lib/consumables";
import { ShopReferenceEditor, descriptionExcerpt } from "./admin-shop-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const catalog: ConsumableCatalog = {
  intro: [
    {
      image: "/shop/intro.webp",
      name_fr: "Bienvenue",
      name_en: "Welcome",
      description_fr: "## Titre\nLa boutique ouvre chaque semaine.",
      description_en: "## Title\nThe shop opens every week.",
      cost: "",
    },
  ],
  advisors: [
    {
      image: "",
      name_fr: "Conseiller de guerre",
      name_en: "War advisor",
      description_fr: "Un conseiller.",
      description_en: "An advisor.",
      cost: "1200",
    },
    {
      image: "",
      name_fr: "Conseiller d’or",
      name_en: "Gold advisor",
      description_fr: "Un autre.",
      description_en: "Another.",
      cost: "",
    },
  ],
  equipment: [],
  expedition: [],
  inventory: [],
};

function renderEditor() {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 200 }));
  render(
    <ShopReferenceEditor
      initialCatalog={structuredClone(catalog)}
      backHref="/admin/referentiels"
      backLabel="Référentiels"
      title="Boutique"
    />,
  );
  return request;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
const panel = () =>
  screen.getByRole("complementary", { name: "Objet sélectionné" });

describe("Bloc 119: the Boutique editor", () => {
  it("shows one line of each item's description, as text", () => {
    renderEditor();
    // The list is for reading, so the Markdown marks come off — the panel is
    // where the Markdown itself is edited.
    expect(screen.getByText("Titre")).toBeInTheDocument();
    expect(screen.queryByText("## Titre")).toBeNull();
  });

  it("edits a description in a box that holds more than one line", () => {
    // The screen this replaces edited several lines of Markdown through a
    // single-line input a few centimetres wide.
    renderEditor();
    const description = within(panel()).getByLabelText("Description");
    expect(description.tagName).toBe("TEXTAREA");
    expect(description).toHaveValue(
      "## Titre\nLa boutique ouvre chaque semaine.",
    );
  });

  it("opens the item that was clicked", () => {
    renderEditor();
    fireEvent.click(screen.getByText("Conseiller de guerre"));
    expect(within(panel()).getByLabelText("Nom")).toHaveValue(
      "Conseiller de guerre",
    );
    expect(within(panel()).getByLabelText(/Coût/)).toHaveValue("1200");
  });

  it("says which costs nobody has confirmed, rather than showing zero", () => {
    renderEditor();
    expect(screen.getByText("Coût à confirmer")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Conseiller d’or"));
    expect(within(panel()).getByLabelText(/Coût/)).toHaveValue("");
  });

  it("has no cost at all on the intro items", () => {
    renderEditor();
    expect(within(panel()).queryByLabelText(/Coût/)).toBeNull();
  });

  it("saves the whole catalog in one request", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByText("Conseiller de guerre"));
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "Conseiller militaire" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(request.mock.calls[0][0]).toBe(
      "/api/admin/guides/references/consumables",
    );
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.advisors[0].name_fr).toBe("Conseiller militaire");
    expect(body.intro[0].name_fr).toBe("Bienvenue");
  });

  it("edits one language without touching the other", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(within(panel()).getByLabelText("Nom")).toHaveValue("Welcome");
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "Hello" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.intro[0]).toMatchObject({
      name_fr: "Bienvenue",
      name_en: "Hello",
    });
  });

  it("reorders inside a category and keeps the panel on the moved item", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByText("Conseiller de guerre"));
    fireEvent.click(
      screen.getByRole("button", { name: "Descendre Conseiller de guerre" }),
    );
    expect(within(panel()).getByLabelText("Nom")).toHaveValue(
      "Conseiller de guerre",
    );
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(
      body.advisors.map((row: { name_fr: string }) => row.name_fr),
    ).toEqual(["Conseiller d’or", "Conseiller de guerre"]);
  });

  it("asks before deleting an item", async () => {
    const request = renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer Conseiller de guerre" }),
    );
    expect(
      screen.getByText("Supprimer définitivement cet objet ?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.advisors).toHaveLength(1);
  });

  it("adds an item to the category whose button was pressed, and opens it", () => {
    renderEditor();
    fireEvent.click(screen.getByTestId("add-row-equipment"));
    expect(within(panel()).getByLabelText("Nom")).toHaveValue("");
    // The Équipement group now counts one, where it counted none: read the
    // header strip the Add button sits in.
    const header = screen
      .getByTestId("add-row-equipment")
      .closest("div")!.parentElement!;
    expect(header).toHaveTextContent("Équipement");
    expect(header).toHaveTextContent("1 objet");
  });

  it("refuses to save an item with no name", async () => {
    const request = renderEditor();
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "" },
    });
    save();
    expect(
      await screen.findByText("Ce champ est obligatoire."),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});

describe("Bloc 119: descriptionExcerpt", () => {
  it("takes the first line that has words in it", () => {
    expect(descriptionExcerpt("\n\nUne ligne\nUne autre")).toBe("Une ligne");
  });

  it("drops the marks that carry no words", () => {
    expect(descriptionExcerpt("### Titre")).toBe("Titre");
    expect(descriptionExcerpt("- **Gras** et `code`")).toBe("Gras et code");
    expect(descriptionExcerpt("> Une citation")).toBe("Une citation");
    expect(descriptionExcerpt("[Un lien](https://example.test)")).toBe(
      "Un lien",
    );
    expect(descriptionExcerpt("![alt](/image.webp)")).toBe("alt");
  });

  it("says nothing about an empty description", () => {
    expect(descriptionExcerpt("")).toBe("");
    expect(descriptionExcerpt("   \n  ")).toBe("");
  });
});
