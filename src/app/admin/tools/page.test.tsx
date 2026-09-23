import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ToolsAdminPage from "./page";
import type { AdminToolRow } from "@/components/admin-tools-list";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { calculator: { findMany: vi.fn() } },
}));
// Namespaced keys come back as "namespace.key", the root translator as the
// key itself — enough to tell which catalogue a label was read from, and to
// give the sort something locale-aware to work on.
const labels: Record<string, string> = {
  "city-cost.name": "Coût de Ville",
  "city-rewards.name": "Récompenses de Production",
  "ranking.name": "Classement",
  "stuff-simulator.name": "Équipement de Combat",
};
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : (labels[key] ?? key),
  getLocale: async () => "fr",
}));
vi.mock("@/components/admin-tools-list", () => ({
  AdminToolsList: (props: { rows: unknown[]; canOpenReferences: boolean }) => (
    <pre data-testid="rows">{JSON.stringify(props)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedCalculatorFindMany = vi.mocked(prisma.calculator.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const tool = (id: string, slug: string, category: string, active = true) => ({
  id,
  slug,
  category,
  active,
});

async function renderPage(role = "super_admin") {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "admin", role, name: "Admin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  render(await ToolsAdminPage());
  return JSON.parse(screen.getByTestId("rows").textContent ?? "{}") as {
    rows: AdminToolRow[];
    canOpenReferences: boolean;
    canEdit: boolean;
    canToggle: boolean;
  };
}

describe("Bloc 119: the Outils page hands the list its rows", () => {
  it("Bloc62/C: sorts them by the label actually shown", async () => {
    // Deliberately out of order, and in an order that only comes out right
    // if the page sorted on the translated label.
    mockedCalculatorFindMany.mockResolvedValue([
      tool("1", "ranking", "classement"),
      tool("2", "city-rewards", "villes"),
      tool("3", "city-cost", "villes"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const { rows } = await renderPage();
    expect(rows.map((row) => row.label)).toEqual([
      "Classement",
      "Coût de Ville",
      "Récompenses de Production",
    ]);
  });

  it("says where each tool's parameters live", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      tool("1", "city-cost", "villes"),
      tool("2", "ranking", "classement"),
      tool("3", "city-rewards", "villes"),
      tool("4", "stuff-simulator", "competences"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const { rows } = await renderPage();
    const source = (slug: string) =>
      rows.find((row) => row.slug === slug)?.source;

    // Shared with the two other Villes tools, and it says how many.
    expect(source("city-cost")).toEqual({
      kind: "shared",
      href: "/admin/tools/city-parameters",
      sharedCount: 3,
    });
    expect(source("ranking")).toEqual({
      kind: "own",
      href: "/admin/tools/ranking",
    });
    expect(source("city-rewards")).toEqual({ kind: "none" });
    // The reference's name comes from the Référentiels catalogue, so both
    // screens call it the same thing.
    expect(source("stuff-simulator")).toEqual({
      kind: "reference",
      href: "/admin/referentiels/reference-combat-equipment",
      referenceLabel: "admin.referentiels.references.combat-equipment",
    });
  });

  it("only offers a way into the references to a role that may open them", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      tool("1", "stuff-simulator", "competences"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    expect((await renderPage("super_admin")).canOpenReferences).toBe(true);
    cleanup();
    // Gestion Outils may write tools but cannot read references at all.
    const toolsManager = await renderPage("tools_manager");
    expect(toolsManager.canOpenReferences).toBe(false);
    expect(toolsManager.canEdit).toBe(true);
  });

  it("passes the toggle permission through unchanged", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      tool("1", "ranking", "classement"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const readOnly = await renderPage("read_only");
    expect(readOnly.canToggle).toBe(false);
    expect(readOnly.canEdit).toBe(false);
  });
});
