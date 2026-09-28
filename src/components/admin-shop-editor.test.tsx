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
      name: { fr: "Bienvenue", en: "Welcome" },
      description: {
        fr: "## Titre\nLa boutique ouvre chaque semaine.",
        en: "## Title\nThe shop opens every week.",
      },
      cost: "",
    },
  ],
  advisors: [
    {
      image: "",
      name: { fr: "Conseiller de guerre", en: "War advisor" },
      description: { fr: "Un conseiller.", en: "An advisor." },
      cost: "1200",
    },
    {
      image: "",
      name: { fr: "Conseiller d’or", en: "Gold advisor" },
      description: { fr: "Un autre.", en: "Another." },
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

  it("opens on the first section that has something in it", () => {
    // An empty Intro would otherwise show a list with no panel beside it.
    const empty = { ...catalog, intro: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <ShopReferenceEditor
        initialCatalog={structuredClone(empty)}
        backHref="/admin/referentiels"
        backLabel="Référentiels"
        title="Boutique"
      />,
    );
    expect(within(panel()).getByLabelText("Nom")).toHaveValue(
      "Conseiller de guerre",
    );
  });

  it("edits a description in a box that holds more than one line", () => {
    // The screen this replaces edited several lines of Markdown through a
    // single-line input a few centimetres wide.
    renderEditor();
    const description = within(panel()).getByLabelText(
      "Description · Markdown",
    );
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
    expect(body.advisors[0].name.fr).toBe("Conseiller militaire");
    expect(body.intro[0].name.fr).toBe("Bienvenue");
  });

  it("edits one language without touching the other", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    expect(within(panel()).getByLabelText("Nom")).toHaveValue("Welcome");
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "Hello" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.intro[0].name).toEqual({ fr: "Bienvenue", en: "Hello" });
  });

  // Bloc 127 (PR 1/3) : ce que la paire ne pouvait pas faire. Sur l'onglet DE,
  // taper un nom allemand l'écrivait dans la colonne anglaise, le montrait en
  // retour sur l'onglet DE — qui lit la même colonne — et détruisait l'anglais
  // sans rien dire (Bloc 125 §9).
  it("Bloc127: writes German in German, and leaves the other languages alone", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^DE/ }));
    // Rien n'est encore écrit en allemand : le champ est vide, il ne montre pas
    // l'anglais comme s'il l'était.
    expect(within(panel()).getByLabelText("Nom")).toHaveValue("");
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "Willkommen" },
    });
    fireEvent.change(within(panel()).getByLabelText("Description · Markdown"), {
      target: { value: "## Titel" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.intro[0].name).toEqual({
      fr: "Bienvenue",
      en: "Welcome",
      de: "Willkommen",
    });
    expect(body.intro[0].description).toEqual({
      fr: "## Titre\nLa boutique ouvre chaque semaine.",
      en: "## Title\nThe shop opens every week.",
      de: "## Titel",
    });
    // Et l'onglet FR rend bien le français, pas ce qui vient d'être tapé.
    fireEvent.click(screen.getByRole("button", { name: /^FR/ }));
    expect(within(panel()).getByLabelText("Nom")).toHaveValue("Bienvenue");
  });

  it("Bloc127: offers the five languages of the site, and says which are hidden", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    render(
      <ShopReferenceEditor
        initialCatalog={structuredClone(catalog)}
        backHref="/admin/referentiels"
        backLabel="Référentiels"
        title="Boutique"
        hiddenLocales={["es"]}
      />,
    );
    for (const code of ["FR", "EN", "DE", "ES", "TR"])
      expect(
        screen.getByRole("button", { name: new RegExp(`^${code} — `) }),
        code,
      ).toBeVisible();
    // Une langue éteinte dans Configuration le dit, pour qu'une traduction
    // écrite et invisible ne se lise pas comme un enregistrement raté.
    expect(
      screen.getByRole("button", { name: /^ES — .*masquée sur le site/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /^FR — [^m]*$/ }),
      "une langue active n'est jamais marquée masquée",
    ).toBeVisible();
  });

  it("Bloc127: clearing a language drops it instead of saving it blank", async () => {
    // Le Bloc 126/D : `""` est une traduction qui existe et ne dit rien, sur
    // laquelle le repli public s'arrête. Absente, l'anglais reprend la main.
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.intro[0].name).toEqual({ fr: "Bienvenue" });
  });

  it("Bloc127: saves an item written in one language only", async () => {
    // La règle de validation : une ligne doit porter un nom et une description
    // dans **au moins une** langue, pas dans celle qui est ouverte — sinon
    // l'écran exigerait cinq traductions avant tout enregistrement, ce qui est
    // la meilleure façon d'apprendre à en inventer.
    const request = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^DE/ }));
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.intro[0].name).toEqual({ fr: "Bienvenue", en: "Welcome" });
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
      body.advisors.map((row: { name: { fr: string } }) => row.name.fr),
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

  it("Bloc127: refuse une ligne écrite dans une langue sans repli public", async () => {
    // Revue Codex (PR #167, P2) : le repli va de la langue du visiteur à
    // l'anglais puis au français. Un objet nommé en allemand seul serait donc
    // blanc pour tous les autres — et l'écran l'acceptait.
    const request = renderEditor();
    for (const code of ["FR", "EN"]) {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${code}`) }),
      );
      fireEvent.change(within(panel()).getByLabelText("Nom"), {
        target: { value: "" },
      });
      fireEvent.change(
        within(panel()).getByLabelText("Description · Markdown"),
        { target: { value: "" } },
      );
    }
    fireEvent.click(screen.getByRole("button", { name: /^DE/ }));
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "Willkommen" },
    });
    fireEvent.change(within(panel()).getByLabelText("Description · Markdown"), {
      target: { value: "## Titel" },
    });
    save();
    expect(
      await screen.findByText(
        "Chaque objet doit avoir un nom et une description en français ou en anglais — les autres langues sont facultatives.",
      ),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it("refuses to save an item with no name in any language", async () => {
    const request = renderEditor();
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^EN/ }));
    fireEvent.change(within(panel()).getByLabelText("Nom"), {
      target: { value: "" },
    });
    save();
    expect(
      await screen.findByText(
        "Chaque objet doit avoir un nom et une description en français ou en anglais — les autres langues sont facultatives.",
      ),
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

describe("Bloc 125 §7: the description box holds a description", () => {
  it("is six rows tall, resizable, and set for prose", () => {
    renderEditor();
    const description = within(panel()).getByLabelText(
      "Description · Markdown",
    );
    expect(description.tagName).toBe("TEXTAREA");
    expect(description).toHaveAttribute("rows", "6");
    expect(description.className).toContain("min-h-[150px]");
    expect(description.className).toContain("resize-y");
    // 13px over 1.6 — read back as a paragraph, not as a one-line field.
    expect(description.className).toContain("text-[13px]");
    expect(description.className).toContain("leading-[1.6]");
    expect(description.className).not.toContain("font-admin-mono");
  });

  it("keeps the sapphire cost under it, for the categories that have one", () => {
    renderEditor();
    // The screen opens on Intro, whose rows are a currency explained rather
    // than an item priced — so there is nothing to cost there.
    expect(within(panel()).queryByLabelText(/Coût/)).toBeNull();
    fireEvent.click(screen.getByText("Conseiller de guerre"));
    const cost = within(panel()).getByLabelText(/Coût/);
    expect(cost).toBeVisible();
    // Under the description, not beside it.
    expect(
      within(panel())
        .getByLabelText("Description · Markdown")
        .compareDocumentPosition(cost) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
