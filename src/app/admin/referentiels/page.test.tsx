import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReferentielsAdminPage from "./page";
import type { AdminReferenceRow } from "@/components/admin-references-list";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    calculator: { findMany: vi.fn() },
    // Bloc 130: the screen also asks which launch languages are switched
    // off, so the description panel can say which the public cannot see.
    localeSetting: { findMany: vi.fn(async () => []) },
  },
}));
// Titles come from the Référentiels catalogue, tool names from the root one;
// giving them different shapes keeps the two apart in the assertions.
const titles: Record<string, string> = {
  "references.events": "Événements",
  "references.gemmes": "Gemmes",
  "references.templiers": "Templiers",
  "references.consommables": "Boutique",
  "references.combat-equipment": "Équipements de Combat",
};
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) =>
    Object.assign(
      (key: string) => (namespace ? (titles[key] ?? key) : `outil ${key}`),
      { has: () => true },
    ),
  getLocale: async () => "fr",
}));
vi.mock("@/components/admin-references-list", () => ({
  AdminReferencesList: (props: { rows: unknown[]; canWrite: boolean }) => (
    <pre data-testid="rows">{JSON.stringify(props)}</pre>
  ),
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedCalculatorFindMany = vi.mocked(prisma.calculator.findMany);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const reference = (slug: string, active = true) => ({
  id: `calculator-${slug}`,
  slug,
  active,
});

async function renderPage(role = "super_admin") {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "admin", role, name: "Admin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  render(await ReferentielsAdminPage());
  return JSON.parse(screen.getByTestId("rows").textContent ?? "{}") as {
    rows: AdminReferenceRow[];
    canWrite: boolean;
  };
}

describe("Bloc 119: the Référentiels page hands the list its rows", () => {
  it("Bloc33/G: routes Templiers to the formula editor it shares with the tool", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      reference("templiers"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const { rows } = await renderPage();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      // The slug is the id: it is what the visibility endpoint is keyed by.
      id: "templiers",
      title: "Templiers",
      active: true,
      editHref: "/admin/tools/templars?from=referentiels",
    });
  });

  it("Bloc43/44 and Bloc60: routes the Boutique and Événements to their own editors", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      reference("consommables"),
      reference("events", false),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const { rows } = await renderPage("references_manager");
    expect(rows.map((row) => row.editHref)).toEqual([
      "/admin/referentiels/reference-consommables",
      "/admin/referentiels/reference-events",
    ]);
    expect(rows[1].active).toBe(false);
  });

  it("names the tool that reads each reference, and leaves the others blank", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      reference("combat-equipment"),
      reference("gemmes"),
      reference("events"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const { rows } = await renderPage();
    const usedBy = Object.fromEntries(rows.map((row) => [row.id, row.usedBy]));
    expect(usedBy["combat-equipment"]).toBe("outil stuff-simulator.name");
    expect(usedBy.gemmes).toBe("outil gems.name");
    // Événements feeds no simulator: the cell shows an em dash, not a link.
    expect(usedBy.events).toBeNull();
  });

  it("Bloc62/C: sorts rows by the displayed title", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      reference("templiers"),
      reference("consommables"),
      reference("events"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    const { rows } = await renderPage();
    expect(rows.map((row) => row.title)).toEqual([
      "Boutique",
      "Événements",
      "Templiers",
    ]);
  });

  it("passes the write permission through", async () => {
    mockedCalculatorFindMany.mockResolvedValue([
      reference("templiers"),
    ] as unknown as Awaited<ReturnType<typeof prisma.calculator.findMany>>);
    expect((await renderPage("references_manager")).canWrite).toBe(true);
    cleanup();
    expect((await renderPage("read_only")).canWrite).toBe(false);
  });
});
