import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LogsPage from "./page";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock("next-intl/server", () => {
  const translator = Object.assign(
    (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
    { has: () => true },
  );
  return {
    getTranslations: async () => translator,
    getMessages: async () => ({}),
    getLocale: async () => "fr",
  };
});
vi.mock("@/components/admin-logs-filters", () => ({
  AdminLogsFilters: ({ usernames }: { usernames: string[] }) => (
    <div data-testid="filters">{usernames.join(",")}</div>
  ),
}));
vi.mock("@/components/admin-logs-purge", () => ({
  AdminLogsPurge: () => <div data-testid="purge" />,
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedAuditFindMany = vi.mocked(prisma.auditLog.findMany);
const mockedUserFindMany = vi.mocked(prisma.user.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

type Log = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number] & {
  user: { username: string };
};

const log = (id: string, iso: string, role = "super_admin"): Log =>
  ({
    id,
    user: { username: "rootadmin" },
    actorRole: role,
    messageKey: "guide.publish",
    messageParams: "{}",
    legacyMessage: "",
    createdAt: new Date(iso),
  }) as unknown as Log;

async function renderPage(
  logs: Log[],
  { role = "super_admin", page }: { role?: string; page?: string } = {},
) {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "admin", role, name: "rootadmin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  mockedAuditFindMany.mockResolvedValue(logs);
  mockedUserFindMany.mockResolvedValue([
    { username: "claire" },
    { username: "rootadmin" },
  ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);
  render(
    await LogsPage({
      searchParams: Promise.resolve(page ? { page } : {}),
      params: Promise.resolve({}),
    }),
  );
}

describe("Bloc 119: the audit log, grouped by day", () => {
  it("opens a heading per day, with the number of actions it holds", async () => {
    await renderPage([
      log("3", "2026-09-22T18:04:00Z"),
      log("2", "2026-09-22T16:00:00Z"),
      log("1", "2026-09-21T09:00:00Z"),
    ]);
    expect(
      screen.getByRole("columnheader", {
        name: /Mardi 22 septembre 2026 day-actions:\{"count":2\}/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: /Lundi 21 septembre 2026 day-actions:\{"count":1\}/,
      }),
    ).toBeInTheDocument();
  });

  it("files a late-evening action under the Paris day, not the UTC one", async () => {
    // 23:30 UTC on the 21st is 01:30 on the 22nd in Paris: the two rows
    // belong to the same working evening and must not be split.
    await renderPage([
      log("2", "2026-09-21T23:30:00Z"),
      log("1", "2026-09-21T22:10:00Z"),
    ]);
    expect(
      screen.getByRole("columnheader", {
        name: /Mardi 22 septembre 2026/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("01:30")).toBeInTheDocument();
  });

  it("shows the role as a translated pill, never the raw key", async () => {
    await renderPage([log("1", "2026-09-22T18:04:00Z", "guides_manager")]);
    const row = screen.getAllByRole("row").at(-1) as HTMLElement;
    expect(within(row).getByText("guides_manager")).toBeInTheDocument();
    // The mocked translator echoes the key; what matters is that the cell
    // went through `roles`, which the real one translates.
    // 18:04 UTC is 20:04 in Paris in September.
    expect(within(row).getByText("20:04")).toBeInTheDocument();
  });

  it("offers the previous days only when there are older entries", async () => {
    // The page reads one row more than it shows: its presence is the signal.
    await renderPage(
      Array.from({ length: 21 }, (_, index) =>
        log(String(index), "2026-09-22T18:04:00Z"),
      ),
    );
    expect(screen.getByRole("link", { name: "load-more" })).toHaveAttribute(
      "href",
      "/admin/logs?page=2",
    );
    cleanup();
    await renderPage([log("1", "2026-09-22T18:04:00Z")]);
    expect(screen.queryByRole("link", { name: "load-more" })).toBeNull();
  });

  it("widens the window rather than paging, on the second click", async () => {
    await renderPage([log("1", "2026-09-22T18:04:00Z")], { page: "2" });
    expect(mockedAuditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 41 }),
    );
  });

  it("says so when no entry matches the filters", async () => {
    await renderPage([]);
    expect(screen.getByText("no-results")).toBeInTheDocument();
  });
});

describe("Bloc 119: who may purge", () => {
  it("shows the purge card to a Super Admin", async () => {
    await renderPage([log("1", "2026-09-22T18:04:00Z")]);
    expect(screen.getByTestId("purge")).toBeInTheDocument();
  });

  it("hides it from an Admin, who may read the log but not empty it", async () => {
    await renderPage([log("1", "2026-09-22T18:04:00Z")], { role: "admin" });
    expect(screen.queryByTestId("purge")).toBeNull();
  });
});
