import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferentielsPage, {
  generateMetadata,
} from "./[locale]/(public)/referentiels/page";

// Bloc 52/A: the index page's title was "Tous les référentiels" — shortened
// to just "Référentiels" for the <title> metadata, matching /guides's own
// short "Guides" title.
// Bloc 129 §3.3: the on-screen h1 goes back to the short title, with the
// index's own intro sentence beside it. Bloc 53/D had made it borrow the
// homepage's section title ("Retrouve les données clés") so the page read as
// the same entry point reached another way; the brief gives each its own
// role. The <title> metadata never moved — still the short one.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) =>
    ({
      title: "Référentiels",
      "index-intro": "Phrase d'intro référentiels.",
      home: "Accueil",
      referentiels: "Référentiels",
      breadcrumb: "Fil d'Ariane",
    })[key] ?? key,
  getLocale: async () => "fr",
}));
// Bloc 129 §3.3 : la page lit les descriptions en base (Bloc 130) ; ici
// aucune n'est écrite, ce qui est aussi l'état de production au moment de
// la livraison — la ligne de description est alors simplement absente.
vi.mock("@/lib/tool-descriptions-server", () => ({
  getPublicDescriptions: async () => ({}),
}));
vi.mock("@/components/reference-catalog-grid", () => ({
  ReferenceCatalogGrid: () => <div data-testid="reference-catalog-grid" />,
}));
vi.mock("@/lib/site-url", () => ({
  canonicalUrl: (locale: string, path: string) =>
    `https://ml-helper.com/${locale}${path}`,
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
  it("Bloc129/§3.3: porte le titre court et sa propre introduction", async () => {
    render(await ReferentielsPage());
    expect(
      screen.getByRole("heading", { name: "Référentiels", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Phrase d'intro référentiels."),
    ).toBeInTheDocument();
  });

  it("Bloc129/§2.3: ouvre sur un fil d'Ariane qui remonte à l'accueil", async () => {
    render(await ReferentielsPage());
    const nav = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(nav).toBeInTheDocument();
  });

  it("Bloc52/A: still uses the short title for the page's <title> metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Référentiels");
  });
});
