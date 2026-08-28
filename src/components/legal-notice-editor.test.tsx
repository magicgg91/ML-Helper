import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LegalNoticeEditor } from "./legal-notice-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

describe("LegalNoticeEditor", () => {
  afterEach(cleanup);
  beforeEach(() => vi.restoreAllMocks());

  it("edits and submits the French field by default", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <LegalNoticeEditor
        initialContent={{
          fr: "## Ancien texte",
          en: "## Old text",
        }}
      />,
    );

    const editor = screen.getByLabelText("Markdown");
    expect(editor).toHaveValue("## Ancien texte");
    expect(document.querySelector(".w-md-editor-preview h2")).toHaveTextContent(
      "Ancien texte",
    );
    fireEvent.change(editor, {
      target: { value: "## Nouveau\n\nTexte légal" },
    });
    expect(document.querySelector(".w-md-editor-preview h2")).toHaveTextContent(
      "Nouveau",
    );
    const actionBar = document.querySelector(".editor-action-bar");
    expect(actionBar).toContainElement(
      screen.getByRole("link", { name: "← Retour" }),
    );
    expect(actionBar).toContainElement(
      screen.getByRole("button", { name: "Enregistrer" }),
    );
    // Bloc 32/B: the language selector moved into the action bar instead of
    // sitting below it.
    expect(actionBar).toContainElement(
      screen.getByLabelText("Langue du contenu"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      content: { fr: "## Nouveau\n\nTexte légal", en: "## Old text" },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Mentions légales enregistrées.",
    );
  });

  it("edits the English field without replacing the French field", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <LegalNoticeEditor
        initialContent={{
          fr: "## Ancien texte",
          en: "## Old text",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Langue du contenu"), {
      target: { value: "en" },
    });
    const editor = screen.getByLabelText("Markdown");
    expect(editor).toHaveValue("## Old text");
    fireEvent.change(editor, { target: { value: "## Updated legal text" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      content: { fr: "## Ancien texte", en: "## Updated legal text" },
    });
  });
});
