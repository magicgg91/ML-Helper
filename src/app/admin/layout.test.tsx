import { cleanup, render, screen } from "@testing-library/react";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLayout, { generateMetadata } from "./layout";
import type { AdminSidebarCounts } from "@/components/admin-sidebar";
import { legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";

// Bloc 42/J: the admin section has no organic-search value and must never
// be indexed — this used to be the site-wide root metadata (applied to
// every public page too, since none of them overrode `description`).
// Codex review (PR #68): a real generateMetadata (not a static export)
// so the title/description follow the active locale, same as every real
// page's own metadata.
describe("AdminLayout metadata (Bloc 42/J)", () => {
  it("sets robots noindex/nofollow, plus a non-empty, locale-aware title/description", async () => {
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
  });
});

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/auth/options", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn() },
    calculator: { count: vi.fn() },
    guide: { count: vi.fn() },
    staticContent: { findUnique: vi.fn() },
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
// Bloc 119: the shell and its column have their own test files. Here it
// stands in for them, so this file can assert what the layout *computes* —
// which counters it reads, and for whom.
vi.mock("@/components/admin-shell", () => ({
  AdminShell: ({
    role,
    username,
    totpEnabled,
    counts,
    children,
  }: {
    role: string;
    username: string;
    totpEnabled: boolean;
    counts: AdminSidebarCounts;
    children: ReactNode;
  }) => (
    <div
      data-testid="shell"
      data-role={role}
      data-username={username}
      data-totp={String(totpEnabled)}
      data-counts={JSON.stringify(counts)}
    >
      {children}
    </div>
  ),
}));

const mockedSession = vi.mocked(getServerSession);
const mockedAccount = vi.mocked(prisma.user.findUnique);
const mockedUserCount = vi.mocked(prisma.user.count);
const mockedCalculatorCount = vi.mocked(prisma.calculator.count);
const mockedGuideCount = vi.mocked(prisma.guide.count);
const mockedStaticContent = vi.mocked(prisma.staticContent.findUnique);

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function signedInAs(role: string) {
  mockedSession.mockResolvedValue({
    user: { id: "admin", role, name: "rootadmin" },
    expires: "2099-01-01",
  });
  mockedAccount.mockResolvedValue({
    totpEnabled: false,
  } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
  // Tools and references are two calls on the same model, in that order.
  mockedCalculatorCount.mockResolvedValueOnce(12).mockResolvedValueOnce(4);
  mockedGuideCount.mockResolvedValue(7);
  mockedUserCount.mockResolvedValue(3);
  mockedStaticContent.mockResolvedValue(null);
}

async function renderLayout() {
  render(
    <>
      {await AdminLayout({
        children: <p>content</p>,
        params: Promise.resolve({}),
      })}
    </>,
  );
  return screen.getByTestId("shell");
}

describe("AdminLayout", () => {
  it("hands the shell the signed-in account and every counter", async () => {
    signedInAs("super_admin");
    const shell = await renderLayout();
    expect(shell.dataset.role).toBe("super_admin");
    expect(shell.dataset.username).toBe("rootadmin");
    expect(JSON.parse(shell.dataset.counts ?? "{}")).toEqual({
      tools: 12,
      referentiels: 4,
      guides: 7,
      users: 3,
      // The French notice has not been edited yet: its seven shipped fields
      // are what the amber badge counts.
      legalPlaceholders: 7,
    });
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("reads no counter the role may not see", async () => {
    // A Gestion Guides account must not learn how many users exist from a
    // badge on a link it cannot open — so the query is not even made.
    signedInAs("guides_manager");
    const shell = await renderLayout();
    expect(JSON.parse(shell.dataset.counts ?? "{}")).toEqual({ guides: 7 });
    expect(mockedUserCount).not.toHaveBeenCalled();
    expect(mockedCalculatorCount).not.toHaveBeenCalled();
    expect(mockedStaticContent).not.toHaveBeenCalled();
  });

  it("leaves Pages légales uncounted for an Admin, who cannot open it", async () => {
    signedInAs("admin");
    const shell = await renderLayout();
    const counts = JSON.parse(shell.dataset.counts ?? "{}") as Record<
      string,
      number
    >;
    expect(counts.legalPlaceholders).toBeUndefined();
    expect(counts.users).toBe(3);
  });

  it("counts the fields left in a notice that has been edited", async () => {
    signedInAs("super_admin");
    mockedStaticContent.mockResolvedValue({
      id: "legal-notice",
      key: legalNoticeKey,
      content: { fr: "# Mentions\n\n[NOM DE L'ÉDITEUR — À COMPLÉTER]" },
      updatedAt: new Date("2026-09-22T10:00:00Z"),
      updatedBy: "rootadmin",
    });
    const shell = await renderLayout();
    expect(
      (JSON.parse(shell.dataset.counts ?? "{}") as AdminSidebarCounts)
        .legalPlaceholders,
    ).toBe(1);
  });

  it("renders the page content unchanged when there is no admin session", async () => {
    mockedSession.mockResolvedValue(null);
    render(
      <>
        {await AdminLayout({
          children: <p>content</p>,
          params: Promise.resolve({}),
        })}
      </>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.queryByTestId("shell")).toBeNull();
  });
});
