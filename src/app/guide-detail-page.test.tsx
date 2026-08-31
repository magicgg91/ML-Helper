import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "./(public)/guides/[slug]/page";

let guide: Record<string, unknown> | null = null;

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/prisma", () => ({
  prisma: { guide: { findFirst: async () => guide } },
}));
vi.mock("@/components/markdown-renderer", () => ({
  MarkdownRenderer: ({ markdown }: { markdown: string }) => (
    <div data-testid="markdown">{markdown}</div>
  ),
}));

let locale = "fr";
vi.mock("next-intl/server", () => ({
  getLocale: async () => locale,
  getTranslations: async (namespace: string) => {
    const catalog: Record<string, string> = {
      "detail.eyebrow": "Guide · {category}",
      "detail.not-translated":
        "Ce guide n’est pas encore traduit dans cette langue.",
      "categories.debuter": "Débuter",
    };
    return (key: string, values?: Record<string, string>) => {
      const raw = namespace === "guides" ? catalog[key] : undefined;
      if (!raw) return key;
      return values
        ? raw.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "")
        : raw;
    };
  },
}));

afterEach(() => {
  cleanup();
  locale = "fr";
});

// Bloc 42/J: same requirement as every other public page — real
// description, hreflang alternates for the 5 launched locales. Uses the
// guide's own excerpt when this locale has one, a generic fallback when it
// doesn't (never empty either way).
describe("GuidePage metadata (Bloc 42/J)", () => {
  it("uses the guide's own excerpt as the description when the locale has one", async () => {
    guide = {
      slug: "mon-guide",
      category: JSON.stringify(["debuter"]),
      title: { fr: "Mon Guide", en: "My Guide" },
      excerpt: { fr: "Résumé du guide" },
      content: { fr: "# Bonjour", en: "# Hello" },
    };
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "mon-guide" }),
      searchParams: Promise.resolve({}),
    });
    expect(metadata.description).toBe("Résumé du guide");
    const languages = metadata.alternates?.languages as
      Record<string, string> | undefined;
    expect(languages?.fr).toBe("https://ml-helper.com/guides/mon-guide");
    expect(languages?.["x-default"]).toBe(
      "https://ml-helper.com/guides/mon-guide",
    );
  });

  it("falls back to a generic, never-empty description when the guide has no excerpt", async () => {
    guide = {
      slug: "guide-sans-excerpt",
      category: JSON.stringify(["debuter"]),
      title: { fr: "Guide" },
      excerpt: {},
      content: { fr: "# Bonjour" },
    };
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "guide-sans-excerpt" }),
      searchParams: Promise.resolve({}),
    });
    expect(metadata.description).toBeTruthy();
  });

  // Codex review (PR #68): localizedText() falls back fr/en, which used to
  // put a French excerpt in the description for a locale (e.g. DE) that
  // has none — while the page body already shows the "not translated"
  // placeholder (Bloc 42/F) for that same locale. hasLocalizedText() must
  // gate the excerpt choice so the description and the body agree.
  it("uses the generic fallback, not another locale's excerpt, when this locale has no excerpt of its own", async () => {
    locale = "de";
    guide = {
      slug: "guide-fr-excerpt-only",
      category: JSON.stringify(["debuter"]),
      title: { fr: "Guide", en: "Guide" },
      excerpt: { fr: "Résumé en français uniquement" },
      content: { fr: "# Bonjour", en: "# Hello" },
    };
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "guide-fr-excerpt-only" }),
      searchParams: Promise.resolve({}),
    });
    expect(metadata.description).not.toBe("Résumé en français uniquement");
    expect(metadata.description).toBeTruthy();
  });
});

// Bloc 42/F: guides are only really written by hand in FR/EN — a missing
// translation for the active locale must show a visible "not translated"
// notice instead of silently falling back to another language.
describe("GuidePage — untranslated guide content placeholder", () => {
  it("renders the markdown content when the active locale has real content", async () => {
    guide = {
      slug: "mon-guide",
      category: JSON.stringify(["debuter"]),
      title: { fr: "Mon Guide", en: "My Guide" },
      content: { fr: "# Bonjour", en: "# Hello" },
    };
    render(
      await GuidePage({
        params: Promise.resolve({ slug: "mon-guide" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("# Bonjour");
    expect(
      screen.queryByText(
        "Ce guide n’est pas encore traduit dans cette langue.",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows the not-translated placeholder when FR content is missing but EN exists (case 1)", async () => {
    guide = {
      slug: "en-only-guide",
      category: JSON.stringify(["debuter"]),
      title: { en: "English Only" },
      content: { en: "# English only content" },
    };
    render(
      await GuidePage({
        params: Promise.resolve({ slug: "en-only-guide" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByText("Ce guide n’est pas encore traduit dans cette langue."),
    ).toBeVisible();
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  it("shows the not-translated placeholder for a newly-activated locale (DE) even though FR/EN both exist (case 2)", async () => {
    locale = "de";
    guide = {
      slug: "fr-en-guide",
      category: JSON.stringify(["debuter"]),
      title: { fr: "Guide", en: "Guide" },
      content: { fr: "# Bonjour", en: "# Hello" },
    };
    render(
      await GuidePage({
        params: Promise.resolve({ slug: "fr-en-guide" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByText("Ce guide n’est pas encore traduit dans cette langue."),
    ).toBeVisible();
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });
});
