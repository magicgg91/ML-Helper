import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LegalNoticeEditor } from "./legal-notice-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

describe("LegalNoticeEditor", () => {
  afterEach(cleanup);
  beforeEach(() => vi.restoreAllMocks());

  // Bloc 93/M1: this bar rendered every message in one neutral style, so a
  // successful save and a server error were visually identical. The tone now
  // travels with the message.
  it("distinguishes a saved confirmation from a server error", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    render(
      <LegalNoticeEditor
        initialContent={{ fr: "## Texte", en: "", de: "", es: "", tr: "" }}
      />,
    );
    const saveButton = screen.getByRole("button", { name: "Enregistrer" });

    fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
    fireEvent.click(saveButton);
    const saved = await screen.findByRole("status");
    expect(saved).toHaveTextContent("Mentions légales enregistrées.");
    expect(saved).toHaveClass("editor-action-message-success");
    expect(saved).not.toHaveClass("editor-action-message-error");

    fetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveClass(
        "editor-action-message-error",
      ),
    );
    // The failure replaces the confirmation instead of sitting beside it.
    expect(screen.getByRole("status")).not.toHaveTextContent(
      "Mentions légales enregistrées.",
    );
  });

  it("edits and submits the French field by default", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <LegalNoticeEditor
        initialContent={{
          fr: "## Ancien texte",
          en: "## Old text",
          de: "",
          es: "",
          tr: "",
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
      content: {
        fr: "## Nouveau\n\nTexte légal",
        en: "## Old text",
        de: "",
        es: "",
        tr: "",
      },
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
          de: "",
          es: "",
          tr: "",
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
      content: {
        fr: "## Ancien texte",
        en: "## Updated legal text",
        de: "",
        es: "",
        tr: "",
      },
    });
  });

  // Bloc 44: DE/ES/TR are selectable alongside FR/EN in the same dropdown.
  it("offers all 5 activated locales in the language selector", () => {
    render(
      <LegalNoticeEditor
        initialContent={{
          fr: "## Ancien texte",
          en: "## Old text",
          de: "",
          es: "",
          tr: "",
        }}
      />,
    );
    const select = screen.getByLabelText("Langue du contenu");
    const options = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual(["FR", "EN", "DE", "ES", "TR"]);
  });
});
