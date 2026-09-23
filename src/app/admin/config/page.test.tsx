import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConfigAdminPage from "./page";
import type { LanguageRow } from "@/components/admin-languages-panel";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/auth/require-session";
import { getTrackingSettings } from "@/lib/site-settings";

vi.mock("@/auth/require-session", () => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guide: { findMany: vi.fn() },
    localeSetting: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/site-settings", () => ({ getTrackingSettings: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/components/admin-languages-panel", () => ({
  AdminLanguagesPanel: (props: { rows: LanguageRow[] }) => (
    <pre data-testid="languages">{JSON.stringify(props.rows)}</pre>
  ),
}));
vi.mock("@/components/tracking-settings-panel", () => ({
  TrackingSettingsPanel: () => <div data-testid="tracking" />,
}));

const mockedRequireCapability = vi.mocked(requireCapability);
const mockedGuideFindMany = vi.mocked(prisma.guide.findMany);
const mockedLocaleFindMany = vi.mocked(prisma.localeSetting.findMany);
const mockedTracking = vi.mocked(getTrackingSettings);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage({
  role = "super_admin",
  url = "",
}: { role?: string; url?: string } = {}) {
  mockedRequireCapability.mockResolvedValue({
    user: { id: "admin", role, name: "Admin" },
  } as Awaited<ReturnType<typeof requireCapability>>);
  mockedGuideFindMany.mockResolvedValue([
    { content: { fr: "a", en: "a", de: "a" } },
    { content: { fr: "b", en: "b" } },
  ] as unknown as Awaited<ReturnType<typeof prisma.guide.findMany>>);
  mockedLocaleFindMany.mockResolvedValue([
    { locale: "es", active: false },
  ] as unknown as Awaited<ReturnType<typeof prisma.localeSetting.findMany>>);
  mockedTracking.mockResolvedValue({ url, websiteId: "" });
  render(await ConfigAdminPage());
  return JSON.parse(
    screen.getByTestId("languages").textContent ?? "[]",
  ) as LanguageRow[];
}

describe("Bloc 119: the Configuration screen", () => {
  it("counts the guides written in each language", async () => {
    const rows = await renderPage();
    const byLocale = Object.fromEntries(rows.map((row) => [row.locale, row]));
    expect(byLocale.fr).toMatchObject({ translated: 2, total: 2 });
    expect(byLocale.de).toMatchObject({ translated: 1, total: 2 });
    expect(byLocale.tr).toMatchObject({ translated: 0, total: 2 });
  });

  it("keeps the two base languages first, and locked", async () => {
    const rows = await renderPage();
    expect(rows.slice(0, 2).map((row) => row.locale)).toEqual(["en", "fr"]);
    expect(rows.slice(0, 2).every((row) => row.locked)).toBe(true);
    expect(rows.slice(2).some((row) => row.locked)).toBe(false);
  });

  it("carries each language's stored visibility", async () => {
    const rows = await renderPage();
    expect(rows.find((row) => row.locale === "es")?.active).toBe(false);
    expect(rows.find((row) => row.locale === "de")?.active).toBe(true);
  });

  it("shows the tracking section to a Super Admin alone", async () => {
    await renderPage();
    expect(screen.getByTestId("tracking")).toBeInTheDocument();
    cleanup();
    // Revue Codex (PR #127): an `admin` keeps the rest of the tab; a field
    // whose save is refused would only be a trap.
    await renderPage({ role: "admin" });
    expect(screen.queryByTestId("tracking")).toBeNull();
  });

  it("says whether a script is loaded at all", async () => {
    await renderPage({ url: "https://example.com/script.js" });
    expect(screen.getByText("tracking.script-active")).toBeInTheDocument();
    cleanup();
    await renderPage({ url: "" });
    expect(screen.getByText("tracking.script-inactive")).toBeInTheDocument();
  });
});
