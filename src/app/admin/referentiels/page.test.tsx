import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferentielsAdminPage from "./page";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({
  requireCapability: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    calculator: { findMany: vi.fn() },
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "fr",
}));
vi.mock("@/components/reference-status-list", () => ({
  ReferenceStatusList: (props: { rows: unknown[] }) => (
    <pre data-testid="rows">{JSON.stringify(props.rows)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedCalculatorFindMany = vi.mocked(prisma.calculator.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReferentielsAdminPage", () => {
  it("gives Templiers its own independent reference row, routed to the shared formula editor (Bloc 33/G)", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedCalculatorFindMany.mockResolvedValue([
      { id: "calculator-templiers-reference", slug: "templiers", active: true },
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);

    render(await ReferentielsAdminPage());

    const rows = JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "templiers",
      slug: "templiers",
      active: true,
      editHref: "/admin/tools/templars?from=referentiels",
    });
    // No more special-casing: Templiers is toggled the same generic way
    // as combat-equipment/expedition-equipment/level-up now — no
    // calculators.toggle-gated override left in the row.
    expect(rows[0].canToggle).toBeUndefined();
    expect(rows[0].toggleHref).toBeUndefined();
  });

  it("Bloc43/44: routes the Shop's reference row to its own admin editor, no shared tool to fall back on (internal slug/route stay unchanged per Bloc 48/F)", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedCalculatorFindMany.mockResolvedValue([
      {
        id: "calculator-consumables-reference",
        slug: "consommables",
        active: true,
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);

    render(await ReferentielsAdminPage());

    const rows = JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows[0]).toMatchObject({
      id: "consommables",
      slug: "consommables",
      active: true,
      editHref: "/admin/referentiels/reference-consommables",
    });
  });

  // Bloc60: the 7th reference — same generic wiring as the other 6, so
  // references_manager (whose access is entirely driven by the shared
  // references.read/write capabilities this page and the [id] editor both
  // gate on, never per-slug) reaches it exactly the same way.
  it("Bloc60: routes the Events reference row to its own admin editor, ships inactive by default", async () => {
    mockedRequireCapability.mockResolvedValue({
      user: { id: "references-manager", role: "references_manager", name: "RM" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedCalculatorFindMany.mockResolvedValue([
      { id: "calculator-events-reference", slug: "events", active: false },
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);

    render(await ReferentielsAdminPage());

    const rows = JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows[0]).toMatchObject({
      id: "events",
      slug: "events",
      active: false,
      editHref: "/admin/referentiels/reference-events",
    });
  });
});
