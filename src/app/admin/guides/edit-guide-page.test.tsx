import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditGuidePage from "./[id]/page";
import { prisma } from "@/lib/prisma";
import { renderWithIntl as render } from "../../../test/render-with-intl";

// Bloc 126/D: the admin's own language, clamped to EN/FR by src/proxy.ts.
// A let rather than a constant so a test can open the screen in both.
let adminLocale = "fr";
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    Object.assign((key: string) => key, {
      has: () => false,
    }),
  getLocale: async () => adminLocale,
}));
vi.mock("@/auth/require-session", () => ({
  requireCapability: async () => ({
    user: { id: "u1", role: "super_admin", name: "Admin" },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guide: { findUnique: vi.fn() },
    // Bloc 125 §9: the page also asks which launch languages are switched
    // off, so the tabs can say which translations the public cannot see.
    localeSetting: { findMany: vi.fn(async () => []) },
  },
}));

afterEach(() => {
  cleanup();
  adminLocale = "fr";
});

const guideRow = {
  id: "guide-1",
  slug: "premiers-pas",
  category: [],
  coverImage: null,
  status: "draft",
  title: { fr: "Premiers pas", en: "First steps" },
  excerpt: {},
  content: { fr: "texte", en: "text" },
  author: "claire",
  createdAt: new Date("2026-09-01T08:00:00Z"),
  updatedAt: new Date("2026-09-02T08:00:00Z"),
} as unknown as Awaited<ReturnType<typeof prisma.guide.findUnique>>;

/**
 * Which language tab the editor opened on. The tabs are named by the
 * language; with `has: () => false` above, that name is the code in capitals.
 */
const openedOn = () =>
  screen.getByRole("tab", { selected: true }).textContent?.trim().slice(0, 2);

async function openEditor(searchParams: Record<string, string> = {}) {
  vi.mocked(prisma.guide.findUnique).mockResolvedValue(guideRow);
  render(
    await EditGuidePage({
      params: Promise.resolve({ id: "guide-1" }),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

// Bloc 50: this file used to only cover the reference-editing branches of
// EditGuidePage (moved to admin/referentiels/edit-referentiel-page.test.tsx
// alongside the routes themselves) — now that those branches are gone,
// this exercises the guide-editing path that's actually left here.
describe("EditGuidePage", () => {
  it("renders the guide editor for a real guide id", async () => {
    vi.mocked(prisma.guide.findUnique).mockResolvedValue({
      id: "guide-1",
      slug: "premiers-pas",
      category: [],
      coverImage: null,
      status: "draft",
      title: { fr: "Premiers pas" },
      excerpt: {},
      content: {},
      author: "claire",
      createdAt: new Date("2026-09-01T08:00:00Z"),
      updatedAt: new Date("2026-09-02T08:00:00Z"),
    } as unknown as Awaited<ReturnType<typeof prisma.guide.findUnique>>);

    render(
      await EditGuidePage({
        params: Promise.resolve({ id: "guide-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    // Bloc 119: the screen is headed by the guide it edits, not by a
    // generic "Éditer un guide".
    expect(
      screen.getByRole("heading", { level: 1, name: "Premiers pas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("claire")).toBeInTheDocument();
  });

  // Bloc 126/D: "Modifier" is the only way most admins reach this screen, and
  // it carries no ?lang=. It used to open on French whatever language the
  // admin was working in, so an English admin landed on the French text.
  describe("opens on the language the admin is reading in", () => {
    it("French for a French admin, English for an English one", async () => {
      adminLocale = "fr";
      await openEditor();
      expect(openedOn()).toBe("FR");
      cleanup();
      adminLocale = "en";
      await openEditor();
      expect(openedOn()).toBe("EN");
    });

    it("unless the list asked for a language by name", async () => {
      // The translation chips link a specific language as ?lang=de, and that
      // shortcut is only honest if the form opens there (Codex, PR #148).
      adminLocale = "en";
      await openEditor({ lang: "de" });
      expect(openedOn()).toBe("DE");
    });

    it("ignoring a language the site does not ship", async () => {
      adminLocale = "en";
      await openEditor({ lang: "jp" });
      expect(openedOn()).toBe("EN");
    });
  });
});
