import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ToolsAdminPage from "./page";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";
import { getTranslations } from "next-intl/server";

vi.mock("@/auth/require-session", () => ({
  requireCapability: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    calculator: { findMany: vi.fn() },
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  ),
  getLocale: async () => "fr",
}));
vi.mock("@/components/calculator-visibility-list", () => ({
  CalculatorVisibilityList: (props: { rows: unknown[] }) => (
    <pre data-testid="rows">{JSON.stringify(props.rows)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedCalculatorFindMany = vi.mocked(prisma.calculator.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ToolsAdminPage", () => {
  // Bloc 62/C: sorted by the displayed label, not DB/insertion order — the
  // mocked findMany result below is deliberately in an order that only
  // makes sense if the page ignored the translated label.
  it("Bloc62/C: sorts rows alphabetically by their displayed label", async () => {
    // page.tsx calls getTranslations("admin.tools") for `t`, then
    // getTranslations() (no namespace) for `messages` — in that order,
    // via Promise.all. Queue one override per call to keep them apart.
    vi.mocked(getTranslations)
      .mockImplementationOnce(
        async () =>
          ((key: string) => key) as unknown as Awaited<
            ReturnType<typeof getTranslations>
          >,
      )
      .mockImplementationOnce(async () => {
        const labels: Record<string, string> = {
          "zebre-tool.name": "Zèbre",
          "abricot-tool.name": "Abricot",
          "mangue-tool.name": "Mangue",
        };
        return ((key: string) => labels[key] ?? key) as unknown as Awaited<
          ReturnType<typeof getTranslations>
        >;
      });
    mockedRequireCapability.mockResolvedValue({
      user: { id: "admin", role: "super_admin", name: "Admin" },
    } as Awaited<ReturnType<typeof requireCapability>>);
    mockedCalculatorFindMany.mockResolvedValue([
      { id: "1", slug: "zebre-tool", category: "combat", active: true },
      { id: "2", slug: "abricot-tool", category: "combat", active: true },
      { id: "3", slug: "mangue-tool", category: "combat", active: true },
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);

    render(await ToolsAdminPage());

    const rows = JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows.map((row: { label: string }) => row.label)).toEqual([
      "Abricot",
      "Mangue",
      "Zèbre",
    ]);
  });
});
