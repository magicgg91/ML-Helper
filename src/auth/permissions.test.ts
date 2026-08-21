import { describe, expect, it } from "vitest";
import { can, type AdminCapability } from "./permissions";
import type { AdminRole } from "./roles";

const sections: AdminCapability[] = [
  "guides.read",
  "calculators.read",
  "references.read",
  "content.read",
  "users.read",
  "logs.view",
];

const expected: Record<AdminRole, AdminCapability[]> = {
  super_admin: sections,
  admin: sections.filter((item) => item !== "content.read"),
  guides_manager: ["guides.read", "references.read"],
  tools_manager: ["calculators.read"],
  read_only: [
    "guides.read",
    "calculators.read",
    "references.read",
    "users.read",
    "logs.view",
  ],
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

  it("moves reference editing to guide managers and keeps tools managers on simulators", () => {
    expect(can("guides_manager", "references.write")).toBe(true);
    expect(can("tools_manager", "calculators.write")).toBe(true);
    expect(can("tools_manager", "calculators.toggle")).toBe(true);
    expect(can("tools_manager", "references.read")).toBe(false);
    expect(can("tools_manager", "guides.write")).toBe(false);
  });

  it("keeps the read-only role free of every mutation capability", () => {
    for (const capability of [
      "users.manage",
      "logs.purge",
      "guides.write",
      "guides.publish",
      "guides.delete",
      "calculators.write",
      "calculators.toggle",
      "references.write",
      "content.write",
    ] as const)
      expect(can("read_only", capability)).toBe(false);
  });

  it("reserves legal content reads and writes to the Super Admin", () => {
    for (const role of [
      "admin",
      "guides_manager",
      "tools_manager",
      "read_only",
    ] as const) {
      expect(can(role, "content.read")).toBe(false);
      expect(can(role, "content.write")).toBe(false);
    }
    expect(can("super_admin", "content.read")).toBe(true);
    expect(can("super_admin", "content.write")).toBe(true);
  });
});
