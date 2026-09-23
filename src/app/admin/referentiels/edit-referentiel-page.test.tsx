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
// Bloc 119: Progression is the first reference screen on the refonte's
// EditorHeader, whose back link is the breadcrumb's — so this mock stands in
// for that shape, not for an EditorActionBar.
vi.mock("@/components/admin-progression-editor", () => ({
  ProgressionEditor: ({ backHref }: { backHref: string }) => (
    <Link href={backHref}>back</Link>
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
// Bloc 119: the Boutique is on the refonte's EditorHeader too.
vi.mock("@/components/admin-shop-editor", () => ({
  ShopReferenceEditor: ({ backHref }: { backHref: string }) => (
    <Link href={backHref}>back</Link>
  ),
}));
vi.mock("@/components/admin-events-editor", () => ({
  EventsReferenceEditor: ({ backHref }: { backHref: string }) => (
    <Link href={backHref}>back</Link>
  ),
}));

afterEach(cleanup);

describe("Bloc35 10.2/10.3: EditReferentielPage's back-link consistency", () => {
  it("shows exactly one back link on the Progression reference page, the editor's own", async () => {
    render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-level-up" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const back = screen.getAllByRole("link", { name: /back/ });
    expect(back).toHaveLength(1);
    expect(back[0]).toHaveAttribute("href", "/admin/referentiels");
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

  it("Bloc43/44: routes 'reference-consommables' to the Boutique editor", async () => {
    render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-consommables" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("link", { name: /back/ })).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });

  it("Bloc60: routes 'reference-events' to the Événements editor", async () => {
    render(
      await EditReferentielPage({
        params: Promise.resolve({ id: "reference-events" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("link", { name: /back/ })).toHaveAttribute(
      "href",
      "/admin/referentiels",
    );
  });
});
