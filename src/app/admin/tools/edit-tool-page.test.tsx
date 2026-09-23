import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditToolPage from "./[id]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/admin-formulas-server", () => ({
  getTemplarParameters: async () => ({ base: 100, ratio: 1.1 }),
  getGemParameters: async () => ({ skillLeagueValue: {}, gemPrice: {} }),
}));
vi.mock("@/lib/templars-presentation-server", () => ({
  getTemplarPresentation: async () => ({}),
}));
// Bloc 119: the screens that are nothing but named numbers moved to their own
// module when they were rewritten on the refonte's components.
vi.mock("@/components/admin-tool-editors", () => ({
  CityParametersEditor: () => null,
  DemoAttackTroopsEditor: () => null,
  GemParametersEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
  XpGainRateEditor: () => null,
}));
// Bloc 119: the cost formula and the presentation catalog are one screen with
// one save, so there is a single component to stand in for.
vi.mock("@/components/admin-templars-editor", () => ({
  TemplarsEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
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

describe("Bloc35 7.1, updated Bloc 50: EditToolPage's contextual back link for the shared Templars editor", () => {
  it("goes back to Référentiels when opened from the Référentiels reference table (?from=referentiels)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({ from: "referentiels" }),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
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

  it("falls back to Référentiels for a references_manager without calculators.read, even with no from param", async () => {
    sessionRole = "references_manager";
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });
});

describe("Bloc36/A, updated Bloc 50: EditToolPage's contextual back link for the shared Gems editor", () => {
  it("goes back to Référentiels when opened from the Référentiels reference table (?from=referentiels)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "gems" }),
        searchParams: Promise.resolve({ from: "referentiels" }),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });

  it("goes back to Tools when opened from the Tools table (no from param)", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "gems" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute("href", "/admin/tools");
  });

  it("falls back to Référentiels for a references_manager without calculators.read, even with no from param", async () => {
    sessionRole = "references_manager";
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "gems" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });
});
