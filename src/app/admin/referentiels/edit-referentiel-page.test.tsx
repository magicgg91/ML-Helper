import { cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditReferentielPage from "./[id]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/auth/require-session", () => ({
  requireCapability: async () => ({
    user: { id: "u1", role: "super_admin", name: "Admin" },
  }),
}));
vi.mock("@/lib/admin-formulas-server", () => ({
  getLevelUpParameters: async () => ({}),
}));
vi.mock("@/lib/consumables-server", () => ({
  getConsumableCatalog: async () => ({
    intro: [],
    advisors: [],
    equipment: [],
    expedition: [],
    inventory: [],
  }),
}));
vi.mock("@/lib/events-server", () => ({
  getEventsCatalog: async () => ({
    bronze: [],
    silver: [],
    gold: [],
    platinum: [],
    diamond: [],
    legend: [],
  }),
}));
vi.mock("@/lib/reference-equipment-server", () => ({
  getCombatReferenceRows: async () => [],
  getCombatSecondaryBase: async () => ({}),
  getCombatStarIncrements: async () => ({}),
  getExpeditionReferenceRows: async () => [],
  getExpeditionStarIncrements: async () => ({}),
  getExpeditionSecondaryBase: async () => ({}),
}));
vi.mock("@/components/named-parameters-editor", () => ({
  LevelUpParametersEditor: () => (
    <div className="calculator-stack">
      <div className="editor-action-bar">
        <Link className="editor-back-action" href="/admin/referentiels">
          back
        </Link>
      </div>
    </div>
  ),
}));
// Bloc 37/E: each screen now owns a single EditorActionBar internally
// (real component tested in reference-admin-editors.test.tsx) — this mock
// only stands in for it here, to keep this page-wiring test isolated.
vi.mock("@/components/reference-admin-editors", () => {
  const Screen = () => (
    <div className="calculator-stack">
      <div className="editor-action-bar">
        <Link className="editor-back-action" href="/admin/referentiels">
          back
        </Link>
      </div>
    </div>
  );
  return {
    CombatReferenceScreen: Screen,
    ExpeditionReferenceScreen: Screen,
  };
});
vi.mock("@/components/consumables-admin-editor", () => ({
  ConsumablesReferenceScreen: () => (
    <div className="calculator-stack">
      <div className="editor-action-bar">
        <Link className="editor-back-action" href="/admin/referentiels">
          back
        </Link>
      </div>
    </div>
  ),
}));
vi.mock("@/components/events-admin-editor", () => ({
  EventsReferenceScreen: () => (
    <div className="calculator-stack">
      <div className="editor-action-bar">
        <Link className="editor-back-action" href="/admin/referentiels">
          back
        </Link>
      </div>
    </div>
  ),
}));

afterEach(cleanup);

describe("Bloc35 10.2/10.3: EditReferentielPage's back-link consistency", () => {
  it("shows only one back link on the Progression reference page, owned by its EditorActionBar", async () => {
    const { container } = render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-level-up" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const backLinks = container.querySelectorAll(".editor-back-action");
    expect(backLinks).toHaveLength(1);
  });

  it("styles the Combat/Expedition admin page's back link like every EditorActionBar back link", async () => {
    render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-combat-equipment" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const back = screen.getByRole("link", { name: /back/ });
    expect(back).toHaveClass("editor-back-action");
    expect(back).toHaveAttribute("href", "/admin/referentiels");
  });

  it("Bloc43/44: routes 'reference-consommables' to ConsumablesReferenceScreen", async () => {
    render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-consommables" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const back = screen.getByRole("link", { name: /back/ });
    expect(back).toHaveClass("editor-back-action");
    expect(back).toHaveAttribute("href", "/admin/referentiels");
  });

  it("Bloc60: routes 'reference-events' to EventsReferenceScreen", async () => {
    render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-events" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const back = screen.getByRole("link", { name: /back/ });
    expect(back).toHaveClass("editor-back-action");
    expect(back).toHaveAttribute("href", "/admin/referentiels");
  });
});
