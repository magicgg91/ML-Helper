import { cleanup, render, screen } from "@testing-library/react";
import { getServerSession } from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";
import { prisma } from "@/lib/prisma";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/auth/options", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/i18n/config", () => ({
  getAvailableLocales: async () => ["en", "fr"],
}));
vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => <nav>nav</nav>,
}));
vi.mock("@/components/admin-account-menu", () => ({
  AdminAccountMenu: () => <div>account</div>,
}));
vi.mock("@/components/locale-toggle", () => ({
  LocaleToggle: () => <div role="group">locale</div>,
}));
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">theme</button>,
}));

const mockedSession = vi.mocked(getServerSession);
const mockedFindUnique = vi.mocked(prisma.user.findUnique);

afterEach(() => {
  cleanup();
  mockedSession.mockReset();
  mockedFindUnique.mockReset();
});

describe("AdminLayout", () => {
  it("opens the public site in a new tab next to the other utility controls", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
      expires: "2099-01-01",
    });
    mockedFindUnique.mockResolvedValue({
      totpEnabled: false,
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    render(
      await AdminLayout({
        children: <p>content</p>,
        params: Promise.resolve({}),
      }),
    );

    const link = screen.getByRole("link", { name: "view-site" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps the main navigation in the top bar, not a sidebar", async () => {
    mockedSession.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
      expires: "2099-01-01",
    });
    mockedFindUnique.mockResolvedValue({
      totpEnabled: false,
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    const { container } = render(
      await AdminLayout({
        children: <p>content</p>,
        params: Promise.resolve({}),
      }),
    );

    expect(container.querySelector("header nav")).toBeInTheDocument();
    expect(container.querySelector('button[aria-label="Menu"]')).toBeNull();
    expect(screen.getByRole("group")).toBeInTheDocument();
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
    expect(screen.queryByRole("link", { name: "view-site" })).toBeNull();
  });
});
