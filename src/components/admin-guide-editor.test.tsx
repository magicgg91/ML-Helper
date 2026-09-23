import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { launchRecord } from "../lib/translations";
import { GuideEditor, type GuideDraft } from "./admin-guide-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const languageNames = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  es: "Español",
  tr: "Türkçe",
};

function draft(overrides: Partial<GuideDraft> = {}): GuideDraft {
  return {
    id: "guide-1",
    slug: "premiers-pas",
    category: ["debuter"],
    coverImage: "",
    status: "draft",
    translations: launchRecord((locale) => ({
      title: locale === "fr" ? "Premiers pas" : "",
      excerpt: locale === "fr" ? "Le guide du débutant" : "",
      content: locale === "fr" ? "## Bienvenue" : "",
    })) as GuideDraft["translations"],
    ...overrides,
  };
}

function renderEditor(
  props: Partial<Parameters<typeof GuideEditor>[0]> = {},
  initial = draft(),
) {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "guide-1" }), { status: 200 }),
    );
  render(
    <GuideEditor
      initial={initial}
      canPublish
      languageNames={languageNames}
      backHref="/admin/guides"
      backLabel="Guides"
      author="claire"
      createdAt="2026-09-01T08:00:00Z"
      updatedAt="2026-09-02T08:00:00Z"
      publicHref="/fr/guides/premiers-pas"
      {...props}
    />,
  );
  return request;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
const publication = () => screen.getByRole("region", { name: "Publication" });

describe("Bloc 119: the guide editor", () => {
  it("is headed by the guide it edits, with the trail back to the list", () => {
    renderEditor();
    expect(
      screen.getByRole("heading", { level: 1, name: "Premiers pas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Guides" })).toHaveAttribute(
      "href",
      "/admin/guides",
    );
  });

  it("puts what describes the guide beside it, not in the action bar", () => {
    renderEditor();
    const card = publication();
    expect(within(card).getByText("Brouillon")).toBeInTheDocument();
    expect(within(card).getByText("claire")).toBeInTheDocument();
    expect(within(card).getByText("01/09/2026")).toBeInTheDocument();
    expect(within(card).getByText("02/09/2026")).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: /Voir sur le site/ }),
    ).toHaveAttribute("href", "/fr/guides/premiers-pas");
  });

  it("offers Publier on a draft and Repasser en brouillon on a published one", async () => {
    const request = renderEditor();
    fireEvent.click(
      within(publication()).getByRole("button", { name: "Publier" }),
    );
    await waitFor(() =>
      expect(
        request.mock.calls.some(([url]) => String(url).endsWith("/status")),
      ).toBe(true),
    );
    const status = request.mock.calls.find(([url]) =>
      String(url).endsWith("/status"),
    )!;
    expect(JSON.parse(String(status[1]?.body))).toEqual({
      status: "published",
    });
    expect(
      within(publication()).getByRole("button", {
        name: "Repasser en brouillon",
      }),
    ).toBeInTheDocument();
  });

  it("offers a review hand-off to somebody who cannot publish", () => {
    renderEditor({ canPublish: false });
    expect(
      within(publication()).getByRole("button", {
        name: "Soumettre en review",
      }),
    ).toBeInTheDocument();
    expect(
      within(publication()).queryByRole("button", { name: "Publier" }),
    ).toBeNull();
  });

  it("selects categories as chips rather than a folded block", async () => {
    const request = renderEditor();
    const card = screen.getByRole("region", { name: "Catégories du guide" });
    const combat = within(card).getByRole("button", {
      name: "Combat & conquête",
    });
    expect(combat).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(combat);
    expect(combat).toHaveAttribute("aria-pressed", "true");
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.category).toEqual(["debuter", "combat"]);
  });

  it("says when there is no cover image, and shows one when there is", () => {
    renderEditor();
    const card = screen.getByRole("region", { name: "Image représentative" });
    expect(within(card).getByText("Aucune image")).toBeInTheDocument();
    fireEvent.change(within(card).getByLabelText("URL de l’image"), {
      target: { value: "https://example.test/cover.jpg" },
    });
    expect(
      within(card).getByAltText("Aperçu de l’image représentative"),
    ).toHaveAttribute("src", "https://example.test/cover.jpg");
  });

  it("marks a language nobody has written in yet, and opens it empty", () => {
    renderEditor();
    const tabs = screen.getByRole("tablist", { name: "Langue du guide" });
    const german = within(tabs).getByRole("tab", { name: "Deutsch à créer" });
    fireEvent.click(german);
    expect(screen.getByLabelText("Titre (DE)")).toHaveValue("");
    expect(screen.getByLabelText("Contenu Markdown (DE)")).toHaveValue("");
  });

  it("creates the language only at the save, and keeps the others", async () => {
    const request = renderEditor();
    fireEvent.click(screen.getByRole("tab", { name: "Deutsch à créer" }));
    fireEvent.change(screen.getByLabelText("Titre (DE)"), {
      target: { value: "Erste Schritte" },
    });
    save();
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.translations.de.title).toBe("Erste Schritte");
    expect(body.translations.fr.title).toBe("Premiers pas");
  });

  it("says whether anything is unsaved, and Annuler puts it back", () => {
    renderEditor();
    expect(screen.getByText("✓ Tout est enregistré")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Titre (FR)"), {
      target: { value: "Premiers pas modifiés" },
    });
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByLabelText("Titre (FR)")).toHaveValue("Premiers pas");
  });

  it("refuses to save a guide with no category at all", async () => {
    const request = renderEditor({}, draft({ category: [] }));
    save();
    expect(
      await screen.findByText(
        "Sélectionne au moins une catégorie avant d’enregistrer.",
      ),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it("switches between the three views of the Markdown editor", () => {
    renderEditor();
    for (const label of ["Écrire", "Côte à côte", "Aperçu"]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
  });

  it("renders the preview the way the public page renders it", () => {
    // Bloc 119 §3 bis: the same single-line-break fix as the legal notice.
    renderEditor(
      {},
      draft({
        translations: launchRecord((locale) => ({
          title: locale === "fr" ? "Premiers pas" : "",
          excerpt: "",
          content: locale === "fr" ? "Une ligne\nUne autre" : "",
        })) as GuideDraft["translations"],
      }),
    );
    const preview = document.querySelector(".w-md-editor-preview");
    expect(preview?.querySelectorAll("br")).toHaveLength(1);
  });
});
