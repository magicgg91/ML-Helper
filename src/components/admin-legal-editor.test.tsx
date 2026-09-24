import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launchRecord } from "@/lib/translations";
import { AdminLegalEditor } from "./admin-legal-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(cleanup);
beforeEach(() => vi.restoreAllMocks());

const languageNames = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  es: "Español",
  tr: "Türkçe",
};

function renderEditor(content: Parameters<typeof launchRecord>[0]) {
  return render(
    <AdminLegalEditor
      publicHref="/legal"
      languageNames={languageNames}
      initialContent={launchRecord(content) as Record<string, string>}
    />,
  );
}

const frenchOnly = (text: string) => (locale: string) =>
  locale === "fr" ? text : "";

describe("Bloc 119: the Pages légales screen", () => {
  it("opens on the French notice, with a tab per language", () => {
    renderEditor(frenchOnly("## Mentions"));
    const tabs = screen.getByRole("tablist", { name: "Langue du contenu" });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(5);
    expect(within(tabs).getByRole("tab", { name: /Français/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Markdown")).toHaveValue("## Mentions");
  });

  it("marks the languages that have nothing written yet", () => {
    renderEditor(frenchOnly("## Mentions"));
    expect(
      screen.getByRole("tab", { name: "Deutsch à créer" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Français à créer" })).toBeNull();
  });

  it("edits one language without touching the others", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    renderEditor((locale) =>
      locale === "fr" ? "## Ancien" : locale === "en" ? "## Old" : "",
    );
    fireEvent.click(screen.getByRole("tab", { name: /English/ }));
    const editor = screen.getByLabelText("Markdown");
    expect(editor).toHaveValue("## Old");
    fireEvent.change(editor, { target: { value: "## Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      content: launchRecord((locale) =>
        locale === "fr" ? "## Ancien" : locale === "en" ? "## Updated" : "",
      ),
    });
  });

  it("says whether anything is unsaved, and stops saying it once saved", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    renderEditor(frenchOnly("## Mentions"));
    expect(screen.getByText("✓ Tout est enregistré")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Markdown"), {
      target: { value: "## Mentions modifiées" },
    });
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(
      await screen.findByText("✓ Tout est enregistré"),
    ).toBeInTheDocument();
  });

  it("keeps saying so when the save fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 500 }),
    );
    renderEditor(frenchOnly("## Mentions"));
    fireEvent.change(screen.getByLabelText("Markdown"), {
      target: { value: "## Modifié" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(
      await screen.findByText("Impossible d’enregistrer les mentions légales."),
    ).toBeInTheDocument();
    // The work is still unsaved, and the screen still says it.
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeInTheDocument();
  });

  it("counts the fields left to fill in, and lists them", () => {
    renderEditor(frenchOnly("[NOM — À COMPLÉTER] et [ADRESSE — À COMPLÉTER]"));
    expect(
      screen.getByText("2 champs restent à compléter."),
    ).toBeInTheDocument();
    // Listed in the banner — the preview highlights the same fields, which
    // is why this looks inside the list rather than anywhere on the page.
    const list = screen.getByRole("list", { name: "Champs à compléter" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["[NOM — À COMPLÉTER]", "[ADRESSE — À COMPLÉTER]"]);
  });

  it("shows no banner on a notice that is finished", () => {
    renderEditor(frenchOnly("Éditeur : Jean Dupont"));
    expect(screen.queryByText(/reste/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Aller au premier" }),
    ).toBeNull();
  });

  it("takes the caret to the first unfinished field", () => {
    renderEditor(frenchOnly("Début\n[NOM — À COMPLÉTER] fin"));
    fireEvent.click(screen.getByRole("button", { name: "Aller au premier" }));
    const textarea = screen.getByLabelText("Markdown") as HTMLTextAreaElement;
    // The write view is the one that has the text in it.
    expect(screen.getByRole("button", { name: "Écrire" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    return waitFor(() => {
      expect(textarea.selectionStart).toBe("Début\n".length);
      expect(textarea.selectionEnd).toBe("Début\n[NOM — À COMPLÉTER]".length);
    });
  });

  it("renders the preview the way the public page renders it", () => {
    // Single line breaks — the notice is written one idea per line — and the
    // unfinished fields highlighted.
    renderEditor(frenchOnly("Une ligne\n[NOM — À COMPLÉTER]"));
    const preview = document.querySelector(".w-md-editor-preview");
    expect(preview?.querySelectorAll("br")).toHaveLength(1);
    expect(preview?.querySelector("mark.legal-placeholder")?.textContent).toBe(
      "[NOM — À COMPLÉTER]",
    );
  });

  it("switches between the three views", () => {
    renderEditor(frenchOnly("## Mentions"));
    for (const [label, expected] of [
      ["Écrire", "true"],
      ["Côte à côte", "true"],
      ["Aperçu", "true"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-pressed",
        expected,
      );
    }
  });

  it("opens the public page in a new tab", () => {
    renderEditor(frenchOnly("## Mentions"));
    const link = screen.getByRole("link", { name: /Voir sur le site/ });
    expect(link).toHaveAttribute("href", "/legal");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
