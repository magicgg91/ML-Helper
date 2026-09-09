import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuidesAdminPage from "./page";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({
  requireCapability: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guide: { findMany: vi.fn() },
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "fr",
}));
vi.mock("@/components/guide-status-list", () => ({
  GuideStatusList: (props: { rows: unknown[] }) => (
    <pre data-testid="rows">{JSON.stringify(props.rows)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedGuideFindMany = vi.mocked(prisma.guide.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GuidesAdminPage", () => {
  it("keeps the create action available even when there are no guides (Bloc 32/A.3 regression)", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );

    render(await GuidesAdminPage());

    expect(screen.getByText("empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "new" })).toHaveAttribute(
      "href",
      "/admin/guides/new",
    );
  });

  // Bloc 55/B: the "Nouveau" action now sits right next to the "Contenu
  // éditorial" eyebrow title, instead of on its own row above the table
  // (Bloc 32) — that row was left orphaned by the post-Bloc 50 rework.
  it("Bloc55/B: puts the 'Nouveau' link next to the eyebrow title, whether or not there are guides", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );

    render(await GuidesAdminPage());

    const heading = screen.getByText("eyebrow").parentElement;
    expect(heading).toHaveClass("admin-section-heading");
    expect(
      screen.getByRole("link", { name: "new" }).parentElement,
    ).toBe(heading);
  });

  it("Bloc55/B: still puts the 'Nouveau' link next to the eyebrow title when guides exist", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedGuideFindMany.mockResolvedValue([
      {
        id: "guide-1",
        slug: "premiers-pas",
        title: { fr: "Premiers pas" },
        content: { fr: "Contenu" },
        author: "Équipe",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        status: "draft",
        active: true,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);

    render(await GuidesAdminPage());

    const heading = screen.getByText("eyebrow").parentElement;
    expect(heading).toHaveClass("admin-section-heading");
    expect(
      screen.getByRole("link", { name: "new" }).parentElement,
    ).toBe(heading);
  });

  // Bloc 55/C: only locales with real written content (hasLocalizedText, no
  // English fallback) count as "written" — a locale key present but blank
  // must not read as translated.
  it("Bloc55/C: computes which locales each guide is really written in", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedGuideFindMany.mockResolvedValue([
      {
        id: "guide-multi",
        slug: "multi",
        title: { fr: "Multi", en: "Multi" },
        content: { fr: "Contenu", en: "Content", de: "" },
        author: "Équipe",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        status: "draft",
        active: true,
      },
      {
        id: "guide-mono",
        slug: "mono",
        title: { fr: "Mono" },
        content: { fr: "Contenu seul" },
        author: "Équipe",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        status: "draft",
        active: true,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);

    render(await GuidesAdminPage());

    const rows = JSON.parse(screen.getByTestId("rows").textContent ?? "[]");
    expect(rows[0].languages).toEqual({
      fr: true,
      en: true,
      de: false,
      es: false,
      tr: false,
    });
    expect(rows[1].languages).toEqual({
      fr: true,
      en: false,
      de: false,
      es: false,
      tr: false,
    });
  });
});
