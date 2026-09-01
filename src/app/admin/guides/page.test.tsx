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
});
