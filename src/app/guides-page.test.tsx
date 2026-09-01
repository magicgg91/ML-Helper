import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidesPage, { generateMetadata } from "./(public)/guides/page";

// Bloc 53/D: /guides' on-screen h1 now reuses the homepage's own guides
// intro title/phrase (Home.guidesTitle/guidesDescription) instead of the
// short "Guides" index title — same treatment /tools got in Bloc 38/K. The
// <title> metadata itself is untouched (still "Public.guides").
vi.mock("next-intl/server", () => ({
  getLocale: async () => "fr",
  getTranslations: async (namespace: string) => {
    if (namespace === "Home")
      return (key: string) =>
        ({
          guidesTitle: "Affûte ta stratégie",
          guidesDescription: "Phrase d'intro guides.",
        })[key] ?? key;
    return (key: string) => ({ guides: "Guides" })[key] ?? key;
  },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/prisma", () => ({
  prisma: { guide: { findMany: vi.fn().mockResolvedValue([]) } },
}));
vi.mock("@/components/guides-hub", () => ({
  GuidesHub: () => <div data-testid="guides-hub" />,
}));
vi.mock("@/lib/site-url", () => ({
  languageAlternates: () => ({}),
}));

afterEach(cleanup);

describe("GuidesPage", () => {
  it("Bloc53/D: shows the homepage's guides title and intro sentence, not the short index title", async () => {
    render(await GuidesPage());
    expect(
      screen.getByRole("heading", { name: "Affûte ta stratégie", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Phrase d'intro guides.")).toBeInTheDocument();
  });

  it("uses the short title for the page's <title> metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Guides");
  });
});
