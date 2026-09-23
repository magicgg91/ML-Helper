import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPage from "./page";
import { requireAdminSession } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth/require-session", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    calculator: { count: vi.fn() },
    guide: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn() },
    auditLog: { findMany: vi.fn() },
    staticContent: { findUnique: vi.fn() },
    localeSetting: { findMany: vi.fn() },
  },
}));
// The key, plus the values it was given: what the screen computes is the
// interesting part, and this makes the numbers assertable without depending
// on a wording.
vi.mock("next-intl/server", () => {
  const translator = Object.assign(
    (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
    { has: () => true },
  );
  return {
    getTranslations: async () => translator,
    getLocale: async () => "fr",
  };
});

const mockedSession = vi.mocked(requireAdminSession);
const mockedCalculatorCount = vi.mocked(prisma.calculator.count);
const mockedGuideCount = vi.mocked(prisma.guide.count);
const mockedGuideFindMany = vi.mocked(prisma.guide.findMany);
const mockedUserCount = vi.mocked(prisma.user.count);
const mockedAuditFindMany = vi.mocked(prisma.auditLog.findMany);
const mockedStaticContent = vi.mocked(prisma.staticContent.findUnique);
const mockedLocaleSetting = vi.mocked(prisma.localeSetting.findMany);

type Log = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number] & {
  user: { username: string };
};

const log = (
  id: string,
  username: string,
  messageKey: string,
  minutes: number,
): Log =>
  ({
    id,
    user: { username },
    messageKey,
    messageParams: "{}",
    legacyMessage: "",
    createdAt: new Date(Date.UTC(2026, 8, 22, 16, minutes)),
  }) as unknown as Log;

/** A complete StaticContent row — Prisma's type wants every column. */
const legalNoticeRow = (content: Record<string, string>) => ({
  id: "legal-notice",
  key: "legal_notice",
  content,
  updatedAt: new Date("2026-09-22T10:00:00Z"),
  updatedBy: "rootadmin",
});

/**
 * A site where everything is in order: every tool visible, every guide
 * published in every language, the legal notice filled in. Each test then
 * breaks the one thing it is about.
 */
function healthySite(role = "super_admin") {
  mockedSession.mockResolvedValue({
    user: { id: "admin", role, name: "rootadmin" },
  } as Awaited<ReturnType<typeof requireAdminSession>>);
  // active tools, total tools, published guides, total guides, active refs,
  // total refs, active users, total users — in the page's own order.
  mockedCalculatorCount
    .mockResolvedValueOnce(11)
    .mockResolvedValueOnce(11)
    .mockResolvedValueOnce(7)
    .mockResolvedValueOnce(7);
  mockedGuideCount.mockResolvedValueOnce(3).mockResolvedValueOnce(3);
  mockedUserCount.mockResolvedValueOnce(2).mockResolvedValueOnce(2);
  mockedGuideFindMany.mockResolvedValue([
    {
      content: { fr: "a", en: "a", de: "a", es: "a", tr: "a" },
    },
  ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);
  mockedAuditFindMany.mockResolvedValue([]);
  mockedStaticContent.mockResolvedValue(
    legalNoticeRow({ fr: "# Mentions complètes", en: "# Complete" }),
  );
  mockedLocaleSetting.mockResolvedValue([]);
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("Bloc 119: the dashboard's four cards", () => {
  it("links each card to its section and says how much is visible", async () => {
    healthySite();
    render(await AdminPage());
    const cards = screen.getByRole("region", { name: "metrics-label" });
    expect(within(cards).getByRole("link", { name: /tools/ })).toHaveAttribute(
      "href",
      "/admin/tools",
    );
    expect(
      within(cards).getByText('tools-summary:{"active":11,"total":11}'),
    ).toBeInTheDocument();
    expect(within(cards).getAllByText("all-visible")).toHaveLength(2);
  });

  it("raises an alert pill when something is hidden from the public", async () => {
    healthySite();
    mockedCalculatorCount.mockReset();
    mockedCalculatorCount
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(7);
    render(await AdminPage());
    expect(screen.getByText('hidden-count:{"count":2}')).toBeInTheDocument();
  });

  it("shows only the cards the role may open", async () => {
    // A Gestion Guides account sees its own section and nothing else — the
    // cards follow the same capabilities as the navigation.
    healthySite("guides_manager");
    render(await AdminPage());
    const cards = screen.getByRole("region", { name: "metrics-label" });
    expect(within(cards).getAllByRole("link")).toHaveLength(1);
    expect(within(cards).getByRole("link", { name: /guides/ })).toHaveAttribute(
      "href",
      "/admin/guides",
    );
  });
});

describe("Bloc 119: the 'à traiter' block", () => {
  it("is not there at all when there is nothing to handle", async () => {
    healthySite();
    render(await AdminPage());
    expect(screen.queryByText("todo")).toBeNull();
  });

  it("counts the legal notice's unfinished fields, in the reference language", async () => {
    healthySite();
    mockedStaticContent.mockResolvedValue(
      legalNoticeRow({
        fr: "[NOM — À COMPLÉTER] et [ADRESSE — À COMPLÉTER]",
        en: "[NAME — TO BE COMPLETED]",
      }),
    );
    render(await AdminPage());
    expect(screen.getByText('todo-legal:{"count":2}')).toBeInTheDocument();
    // The other languages are named, not added to the count: the number
    // stays a number of fields.
    expect(
      screen.getByText('todo-legal-others:{"locales":"en"}'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "todo-legal-action" }),
    ).toHaveAttribute("href", "/admin/content");
  });

  it("lists the guides missing a translation, language by language", async () => {
    healthySite();
    mockedGuideFindMany.mockResolvedValue([
      { content: { fr: "a", en: "a" } },
      { content: { fr: "b" } },
    ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);
    render(await AdminPage());
    expect(
      screen.getByText('todo-guides:{"language":"en","count":1}'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('todo-guides:{"language":"de","count":2}'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/"language":"fr"/)).toBeNull();
  });

  it("says when the language nobody translated is hidden anyway", async () => {
    healthySite();
    mockedGuideFindMany.mockResolvedValue([
      { content: { fr: "a", en: "a", es: "a", tr: "a" } },
    ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);
    mockedLocaleSetting.mockResolvedValue([
      { locale: "de", active: false },
    ] as Awaited<ReturnType<typeof prisma.localeSetting.findMany>>);
    render(await AdminPage());
    expect(screen.getByText("todo-guides-hidden")).toBeInTheDocument();
  });
});

describe("Bloc 119: recent activity", () => {
  it("folds a run of identical saves into one line with its count", async () => {
    healthySite();
    mockedAuditFindMany.mockResolvedValue([
      log("3", "rootadmin", "gems.update", 12),
      log("2", "rootadmin", "gems.update", 8),
      log("1", "claire", "guide.publish", 5),
    ]);
    render(await AdminPage());
    expect(screen.getByText('repeat:{"count":2}')).toBeInTheDocument();
    // Paris, not UTC: 16:08 UTC is 18:08 in September.
    expect(screen.getByText("18:08 – 18:12")).toBeInTheDocument();
    // The single entry keeps its own line and no count pill.
    expect(screen.getByText("claire")).toBeInTheDocument();
    expect(screen.queryByText('repeat:{"count":1}')).toBeNull();
  });

  it("lists each time of a folded run underneath", async () => {
    healthySite();
    mockedAuditFindMany.mockResolvedValue([
      log("2", "rootadmin", "gems.update", 12),
      log("1", "rootadmin", "gems.update", 8),
    ]);
    render(await AdminPage());
    const times = screen.getByRole("list", { name: 'times-label:{"count":2}' });
    expect(
      within(times)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["18:12", "18:08"]);
  });

  it("always offers the way to the full history", async () => {
    healthySite();
    render(await AdminPage());
    expect(screen.getByRole("link", { name: "see-all" })).toHaveAttribute(
      "href",
      "/admin/logs",
    );
  });

  it("hides the block entirely from a role that may not read the log", async () => {
    healthySite("read_only");
    render(await AdminPage());
    expect(screen.queryByText("recent-actions")).toBeNull();
    expect(mockedAuditFindMany).not.toHaveBeenCalled();
  });
});
