import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidesAdminPage from "./page";
import type { AdminGuideRow } from "@/components/admin-guides-list";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { guide: { findMany: vi.fn() } } }));
vi.mock("next-intl/server", () => {
  const translator = Object.assign((key: string) => key, { has: () => true });
  return {
    getTranslations: async () => translator,
    getLocale: async () => "fr",
  };
});
vi.mock("@/components/admin-guides-list", () => ({
  AdminGuidesList: (props: Record<string, unknown>) => (
    <pre data-testid="props">{JSON.stringify(props)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedGuideFindMany = vi.mocked(prisma.guide.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const guide = (overrides: Record<string, unknown> = {}) => ({
  id: "g1",
  slug: "debuter",
  title: { fr: "Bien débuter", en: "Getting started" },
  content: { fr: "texte", en: "text" },
  excerpt: {},
  category: [],
  author: "claire",
  status: "published",
  createdAt: new Date("2026-09-01T08:00:00Z"),
  updatedAt: new Date("2026-09-22T18:04:00Z"),
  publishedAt: new Date("2026-09-02T08:00:00Z"),
  coverImage: null,
  ...overrides,
});

async function renderPage(role = "super_admin") {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "admin", role, name: "Admin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  render(await GuidesAdminPage());
  return JSON.parse(screen.getByTestId("props").textContent ?? "{}") as {
    rows: AdminGuideRow[];
    canWrite: boolean;
    canPublish: boolean;
    canDelete: boolean;
    languageNames: Record<string, string>;
  };
}

describe("Bloc 119: the Guides page hands the list its rows", () => {
  it("says which languages a guide is really written in", async () => {
    // Bloc 55/C: fr/en are always keys, so "written" is the presence of
    // text, not of the key.
    mockedGuideFindMany.mockResolvedValue([
      guide({ content: { fr: "texte", en: "", de: "Text" } }),
    ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);
    const { rows } = await renderPage();
    expect(rows[0].translations).toEqual({
      fr: true,
      en: false,
      de: true,
      es: false,
      tr: false,
    });
  });

  it("passes the dates as ISO, for the list to format in Europe/Paris", async () => {
    mockedGuideFindMany.mockResolvedValue([guide()] as unknown as Awaited<
      ReturnType<typeof prisma.guide.findMany>
    >);
    const { rows } = await renderPage();
    expect(rows[0].createdAt).toBe("2026-09-01T08:00:00.000Z");
    expect(rows[0].updatedAt).toBe("2026-09-22T18:04:00.000Z");
    expect(rows[0].status).toBe("published");
  });

  it("offers the creation only to a role that may write", async () => {
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );
    await renderPage("guides_manager");
    expect(screen.getByRole("link", { name: "new-title" })).toHaveAttribute(
      "href",
      "/admin/guides/new",
    );
    cleanup();
    await renderPage("read_only");
    expect(screen.queryByRole("link", { name: "new-title" })).toBeNull();
  });

  it("splits write, publish and delete the way the matrix does", async () => {
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );
    const manager = await renderPage("guides_manager");
    expect(manager).toMatchObject({
      canWrite: true,
      canPublish: false,
      canDelete: false,
    });
    cleanup();
    const superAdmin = await renderPage("super_admin");
    expect(superAdmin).toMatchObject({
      canWrite: true,
      canPublish: true,
      canDelete: true,
    });
  });

  it("names the five languages for the chips", async () => {
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );
    const { languageNames } = await renderPage();
    expect(Object.keys(languageNames)).toEqual(["fr", "en", "de", "es", "tr"]);
  });
});
