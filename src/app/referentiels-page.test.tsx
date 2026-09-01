import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferentielsPage, {
  generateMetadata,
} from "./(public)/referentiels/page";

// Bloc 52/A: the index page's title was "Tous les référentiels" — shortened
// to just "Référentiels" for the <title> metadata, matching /guides's own
// short "Guides" title.
// Bloc 53/D: the on-screen h1 now reuses the homepage's référentiels intro
// title/phrase (Home.referentielsTitle/referentielsDescription) instead of
// that short title — same treatment /tools got in Bloc 38/K. The <title>
// metadata itself is untouched (still the short "references.title").
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    if (namespace === "Home")
      return (key: string) =>
        ({
          referentielsTitle: "Retrouve les données clés",
          referentielsDescription: "Phrase d'intro référentiels.",
        })[key] ?? key;
    return (key: string) =>
      ({ eyebrow: "Référentiels", title: "Référentiels" })[key] ?? key;
  },
}));
vi.mock("@/components/reference-catalog-grid", () => ({
  ReferenceCatalogGrid: () => <div data-testid="reference-catalog-grid" />,
}));
vi.mock("@/lib/site-url", () => ({
  languageAlternates: () => ({}),
}));
// Bloc 60 review (Codex PR #81): the page now fetches availability itself
// to pass down to ReferenceCatalogGrid (mocked above, so the actual value
// doesn't matter to these tests, just that the call doesn't hit Prisma).
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({}),
}));
// The page now also calls connection() (same as /guides and the homepage)
// to force per-request dynamic rendering — outside Next's real request
// scope, that throws, so it's stubbed the same way guides-page.test.tsx
// stubs it.
vi.mock("next/server", () => ({ connection: async () => undefined }));

afterEach(cleanup);

describe("ReferentielsPage", () => {
  it("Bloc53/D: shows the homepage's référentiels title and intro sentence, not the short index title", async () => {
    render(await ReferentielsPage());
    expect(
      screen.getByRole("heading", {
        name: "Retrouve les données clés",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Phrase d'intro référentiels."),
    ).toBeInTheDocument();
  });

  it("Bloc52/A: still uses the short title for the page's <title> metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Référentiels");
  });
});
