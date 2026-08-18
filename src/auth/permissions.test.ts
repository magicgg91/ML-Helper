import { describe, expect, it } from "vitest";
import { can, type AdminCapability } from "./permissions";
import type { AdminRole } from "./roles";

const sections: AdminCapability[] = [
  "guides.read",
  "calculators.read",
  "references.read",
  "content.read",
  "users.manage",
  "logs.view",
];

const expected: Record<AdminRole, AdminCapability[]> = {
  super_admin: sections,
  admin: sections.filter(
    (item) => item !== "users.manage" && item !== "content.read",
  ),
  guides_manager: ["guides.read"],
  calculators_manager: ["calculators.read", "references.read"],
};

describe("admin role permissions", () => {
  for (const role of Object.keys(expected) as AdminRole[]) {
    it(`${role} receives exactly its allowed sections`, () => {
      for (const section of sections)
        expect(can(role, section), `${role} / ${section}`).toBe(
          expected[role].includes(section),
        );
    });
  }

  it("lets guide managers edit drafts but not publish or delete", () => {
    expect(can("guides_manager", "guides.write")).toBe(true);
    expect(can("guides_manager", "guides.publish")).toBe(false);
    expect(can("guides_manager", "guides.delete")).toBe(false);
    expect(can("admin", "guides.publish")).toBe(true);
    expect(can("super_admin", "guides.delete")).toBe(true);
  });

  it("lets calculator managers edit and toggle calculators and references", () => {
    expect(can("calculators_manager", "calculators.write")).toBe(true);
    expect(can("calculators_manager", "calculators.toggle")).toBe(true);
    expect(can("calculators_manager", "references.write")).toBe(true);
    expect(can("calculators_manager", "guides.write")).toBe(false);
  });

  it("reserves legal content reads and writes to the Super Admin", () => {
    for (const role of [
      "admin",
      "guides_manager",
      "calculators_manager",
    ] as const) {
      expect(can(role, "content.read")).toBe(false);
      expect(can(role, "content.write")).toBe(false);
    }
    expect(can("super_admin", "content.read")).toBe(true);
    expect(can("super_admin", "content.write")).toBe(true);
  });
});
