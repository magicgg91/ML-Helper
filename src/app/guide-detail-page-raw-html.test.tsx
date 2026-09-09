import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidePage from "./[locale]/(public)/guides/[slug]/page";

// Bloc 56: unlike guide-detail-page.test.tsx (which mocks MarkdownRenderer
// away to isolate the page's translation-fallback logic), this file renders
// the real MarkdownRenderer — the exact component the bug report was about
// — to prove a guide, not just the Boutique intro, gets the fix.
let guide: Record<string, unknown> | null = null;

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/prisma", () => ({
  prisma: { guide: { findFirst: async () => guide } },
}));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "fr",
  getTranslations: async () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
  guide = null;
});

describe("GuidePage — Bloc 56: raw HTML support", () => {
  it("renders a raw <img width> tag from guide content at its set size, not escaped as text", async () => {
    guide = {
      slug: "guide-avec-image",
      category: JSON.stringify(["debuter"]),
      title: { fr: "Guide avec image" },
      content: {
        fr: 'Texte avant.\n\n<img src="https://example.com/icon.png" alt="Icône" width="48" height="48" />\n\nTexte après.',
      },
    };
    render(
      await GuidePage({
        params: Promise.resolve({ locale: "fr", slug: "guide-avec-image" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const image = screen.getByRole("img", { name: "Icône" });
    expect(image).toHaveAttribute("src", "https://example.com/icon.png");
    expect(image).toHaveAttribute("width", "48");
    expect(image).toHaveAttribute("height", "48");
  });
});
