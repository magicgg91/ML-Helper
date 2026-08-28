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
    calculator: { findMany: vi.fn() },
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
const mockedCalculatorFindMany = vi.mocked(prisma.calculator.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GuidesAdminPage", () => {
  it("keeps the create action available even when guides and references are both empty (Bloc 32/A.3 regression)", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );
    mockedCalculatorFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>,
    );

    render(await GuidesAdminPage());

    expect(screen.getByText("empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "new" })).toHaveAttribute(
      "href",
      "/admin/guides/new",
    );
  });

  it("gives Templiers its own independent reference row, routed to the shared formula editor (Bloc 33/G)", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedGuideFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>,
    );
    mockedCalculatorFindMany.mockResolvedValue([
      { id: "calculator-templiers-reference", slug: "templiers", active: true },
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);

    render(await GuidesAdminPage());

    const rows = JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "templiers",
      slug: "templiers",
      active: true,
      type: "reference",
      editHref: "/admin/tools/templars?from=guides",
    });
    // No more special-casing: Templiers is toggled the same generic way
    // as combat-equipment/expedition-equipment/level-up now — no
    // calculators.toggle-gated override left in the row.
    expect(rows[0].canToggle).toBeUndefined();
    expect(rows[0].toggleHref).toBeUndefined();
  });
});
