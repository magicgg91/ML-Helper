import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideEditor } from "./guide-editor";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("GuideEditor", () => {
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
          category: "debutants",
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
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    fireEvent.change(screen.getByLabelText("Titre (EN)"), {
      target: { value: "Updated English title" },
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
  });
});
