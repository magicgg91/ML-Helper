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
vi.mock("@/components/named-parameters-editor", () => ({
  TemplarParametersEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
  CityParametersEditor: () => null,
  DemoAttackTroopsEditor: () => null,
  GemParametersEditor: ({ backHref }: { backHref: string }) => (
    <a className="editor-back-action" href={backHref}>
      back
    </a>
  ),
  XpGainRateEditor: () => null,
}));
vi.mock("@/components/templars-presentation-editor", () => ({
  TemplarsPresentationEditor: () => (
    <div data-testid="templars-presentation-editor" />
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

// Bloc 66/B: the presentation catalog editor shares this same edit point,
// rendered alongside the cost-formula editor rather than at its own route.
describe("Bloc66/B: EditToolPage also renders the Templiers presentation editor", () => {
  it("renders both the formula editor and the presentation editor on the templars edit point", async () => {
    render(
      await EditToolPage({
        params: Promise.resolve({ id: "templars" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("back")).toBeInTheDocument();
    expect(
      screen.getByTestId("templars-presentation-editor"),
    ).toBeInTheDocument();
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
