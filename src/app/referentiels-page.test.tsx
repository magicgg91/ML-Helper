import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferentielsPage, {
  generateMetadata,
} from "./(public)/referentiels/page";

// Bloc 52/A: the index page's title was "Tous les référentiels" — shortened
// to just "Référentiels", matching /guides's own short "Guides" title.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) =>
    ({ eyebrow: "Référentiels", title: "Référentiels" })[key] ?? key,
}));
vi.mock("@/components/reference-catalog-grid", () => ({
  ReferenceCatalogGrid: () => <div data-testid="reference-catalog-grid" />,
}));
vi.mock("@/lib/site-url", () => ({
  languageAlternates: () => ({}),
}));

afterEach(cleanup);

describe("ReferentielsPage", () => {
  it("Bloc52/A: shows the short 'Référentiels' title, not 'Tous les référentiels'", async () => {
    render(await ReferentielsPage());
    expect(
      screen.getByRole("heading", { name: "Référentiels", level: 1 }),
    ).toBeInTheDocument();
  });

  it("Bloc52/A: uses the same short title for the page's <title> metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Référentiels");
  });
});
