import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalNoticeEditor } from "./legal-notice-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

describe("LegalNoticeEditor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("edits and submits one raw Markdown field", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<LegalNoticeEditor initialContent="## Ancien texte" />);

    const editor = screen.getByLabelText(
      "Texte des mentions légales (Markdown)",
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      content: "## Nouveau\n\nTexte légal",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Mentions légales enregistrées.",
    );
  });
});
