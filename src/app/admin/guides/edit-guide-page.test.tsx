import { cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import EditGuidePage from "./[id]/page";

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
vi.mock("@/lib/reference-equipment-server", () => ({
  getCombatReferenceRows: async () => [],
  getCombatSkydustBase: async () => ({}),
  getCombatGemSlotsBase: async () => ({}),
  getExpeditionReferenceRows: async () => [],
  getExpeditionStarIncrements: async () => ({}),
  getExpeditionMergeCostBase: async () => ({}),
  getExpeditionDismantleBase: async () => ({}),
}));
vi.mock("@/components/admin-back-link", () => ({
  AdminBackLink: ({ href }: { href: string }) => (
    <Link className="editor-back-action admin-back-link" href={href}>
      back
    </Link>
  ),
}));
vi.mock("@/components/named-parameters-editor", () => ({
  LevelUpParametersEditor: () => (
    <div className="calculator-stack">
      <div className="editor-action-bar">
        <Link className="editor-back-action" href="/admin/guides">
          back
        </Link>
      </div>
    </div>
  ),
}));
vi.mock("@/components/reference-admin-editors", () => ({
  CombatReferenceAdmin: () => <div data-testid="combat-table" />,
  CombatSkydustAdmin: () => <div data-testid="combat-skydust" />,
  CombatGemSlotsAdmin: () => <div data-testid="combat-gem-slots" />,
  ExpeditionIncrementsAdmin: () => <div data-testid="expedition-increments" />,
  ExpeditionMergeCostAdmin: () => <div data-testid="expedition-merge-cost" />,
  ExpeditionDismantleAdmin: () => <div data-testid="expedition-dismantle" />,
  ExpeditionReferenceAdmin: () => <div data-testid="expedition-table" />,
}));

afterEach(cleanup);

describe("Bloc35 10.2/10.3: EditGuidePage's back-link consistency", () => {
  it("shows only one back link on the Level Up reference page, owned by its EditorActionBar", async () => {
    const { container } = render(
      await EditGuidePage({
        params: Promise.resolve({ id: "reference-level-up" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const backLinks = container.querySelectorAll(".editor-back-action");
    expect(backLinks).toHaveLength(1);
    expect(container.querySelector(".admin-back-link")).toBeNull();
  });

  it("styles the Combat/Expedition admin page's back link like every EditorActionBar back link", async () => {
    render(
      await EditGuidePage({
        params: Promise.resolve({ id: "reference-combat-equipment" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const back = screen.getByRole("link", { name: /back/ });
    expect(back).toHaveClass("editor-back-action");
    expect(back).toHaveAttribute("href", "/admin/guides");
  });
});
