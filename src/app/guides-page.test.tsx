import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidesPage, { generateMetadata } from "./[locale]/(public)/guides/page";

// Bloc 129 §3.4 : le H1 revient au titre court « Guides », avec
// l'introduction propre à l'index à côté. Le Bloc 53/D lui faisait
// reprendre le titre de la section Guides de l'accueil pour que la page se
// lise comme le même point d'entrée atteint autrement ; le brief leur donne
// chacun son rôle. Le <title> de la page, lui, n'a jamais bougé.
vi.mock("next-intl/server", () => ({
  getLocale: async () => "fr",
  getTranslations: async () => (key: string) =>
    ({
      guides: "Guides",
      title: "Guides",
      "index-intro": "Phrase d'intro guides.",
      home: "Accueil",
      breadcrumb: "Fil d'Ariane",
      "image-placeholder": "Illustration",
    })[key] ?? key,
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/prisma", () => ({
  prisma: { guide: { findMany: vi.fn().mockResolvedValue([]) } },
}));
vi.mock("@/components/guides-hub", () => ({
  GuidesHub: () => <div data-testid="guides-hub" />,
}));
vi.mock("@/lib/site-url", () => ({
  canonicalUrl: (locale: string, path: string) =>
    `https://ml-helper.com/${locale}${path}`,
  languageAlternates: () => ({}),
}));

afterEach(cleanup);

describe("GuidesPage", () => {
  it("Bloc129/§3.4: porte le titre court et sa propre introduction", async () => {
    render(await GuidesPage());
    expect(
      screen.getByRole("heading", { name: "Guides", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Phrase d'intro guides.")).toBeInTheDocument();
  });

  it("Bloc129/§2.3: ouvre sur un fil d'Ariane", async () => {
    render(await GuidesPage());
    expect(
      screen.getByRole("navigation", { name: "Fil d'Ariane" }),
    ).toBeInTheDocument();
  });

  it("uses the short title for the page's <title> metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Guides");
  });
});
