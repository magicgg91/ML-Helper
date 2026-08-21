import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuideEditor } from "./guide-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("GuideEditor", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ id: "guide-1" }) }),
    );
  });

  it("edits one locale without replacing the other locale", async () => {
    render(
      <GuideEditor
        canPublish={false}
        initial={{
          id: "guide-1",
          slug: "guide-test",
          category: ["debuter"],
          coverImage: "",
          status: "draft",
          translations: {
            fr: {
              title: "Titre FR",
              excerpt: "Résumé FR",
              content: "Contenu FR",
            },
            en: {
              title: "English title",
              excerpt: "English summary",
              content: "English content",
            },
          },
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Langue du guide"), {
      target: { value: "en" },
    });
    expect(screen.queryByRole("tab")).toBeNull();
    fireEvent.change(screen.getByLabelText("Titre (EN)"), {
      target: { value: "Updated English title" },
    });
    fireEvent.change(screen.getByLabelText("Contenu Markdown (EN)"), {
      target: { value: "## Updated\n\nEnglish markdown" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const request = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(String(request?.body));
    expect(body.translations.fr).toEqual({
      title: "Titre FR",
      excerpt: "Résumé FR",
      content: "Contenu FR",
    });
    expect(body.translations.en.title).toBe("Updated English title");
    expect(body.translations.en.content).toBe("## Updated\n\nEnglish markdown");
  });

  it("saves multiple categories and the representative image without changing Markdown rendering", async () => {
    render(
      <GuideEditor
        canPublish={false}
        initial={{
          id: "guide-1",
          slug: "guide-test",
          category: ["debuter"],
          coverImage: "",
          status: "draft",
          translations: {
            fr: { title: "Titre", excerpt: "Résumé", content: "~~ancien~~" },
            en: { title: "Title", excerpt: "Summary", content: "" },
          },
        }}
      />,
    );
    fireEvent.click(screen.getByLabelText("Combat & conquête"));
    expect(
      screen.getByText("Catégories du guide (2 sélectionnées)"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("URL de l’image représentative"), {
      target: { value: "https://example.com/cover.jpg" },
    });
    expect(
      screen.getByAltText("Aperçu de l’image représentative"),
    ).toHaveAttribute("src", "https://example.com/cover.jpg");
    expect(
      document.querySelector(".w-md-editor-preview del"),
    ).toHaveTextContent("ancien");
    const actionBar = document.querySelector(".editor-action-bar");
    expect(actionBar).toContainElement(
      screen.getByRole("link", { name: "← Retour" }),
    );
    expect(actionBar).toContainElement(
      screen.getByRole("button", { name: /^Enregistrer$/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.category).toEqual(["debuter", "combat"]);
    expect(body.coverImage).toBe("https://example.com/cover.jpg");
  });
});
