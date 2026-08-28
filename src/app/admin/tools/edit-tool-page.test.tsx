import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditToolPage from "./[id]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/admin-formulas-server", () => ({
  getTemplarParameters: async () => ({ base: 100, ratio: 1.1 }),
}));
vi.mock("@/components/named-parameters-editor", () => ({
  TemplarParametersEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
  CityParametersEditor: () => null,
  DemoAttackTroopsEditor: () => null,
  GemParametersEditor: () => null,
  XpGainRateEditor: () => null,
}));

let sessionRole = "super_admin";
vi.mock("@/auth/require-session", () => ({
  requireCapability: async () => ({
    user: { id: "u1", role: sessionRole, name: "Admin" },
  }),
}));

afterEach(() => {
  cleanup();
  sessionRole = "super_admin";
});

describe("Bloc35 7.1: EditToolPage's contextual back link for the shared Templars editor", () => {
  it("goes back to Guides when opened from the Guides reference table (?from=guides)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({ from: "guides" }),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute("href", "/admin/guides");
  });

  it("goes back to Tools when opened from the Tools table (no from param)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute("href", "/admin/tools");
  });

  it("falls back to Guides for a guides_manager without calculators.read, even with no from param", async () => {
    sessionRole = "guides_manager";
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute("href", "/admin/guides");
  });
});
