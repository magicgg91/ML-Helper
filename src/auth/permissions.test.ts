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
  guides_manager: ["guides.read"],
  references_manager: ["references.read"],
  tools_manager: ["calculators.read"],
  // Bloc 59/B: read_only lost users.read and logs.view — no access to
  // Historique or Utilisateurs at all.
  read_only: ["guides.read", "calculators.read", "references.read"],
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

  it("carves reference editing out into its own references_manager role", () => {
    expect(can("guides_manager", "references.read")).toBe(false);
    expect(can("guides_manager", "references.write")).toBe(false);
    expect(can("references_manager", "references.read")).toBe(true);
    expect(can("references_manager", "references.write")).toBe(true);
    expect(can("references_manager", "guides.read")).toBe(false);
    expect(can("references_manager", "guides.write")).toBe(false);
    expect(can("references_manager", "calculators.read")).toBe(false);
    expect(can("references_manager", "calculators.write")).toBe(false);
  });

  it("keeps tools managers on simulators, without direct references access", () => {
    expect(can("tools_manager", "calculators.write")).toBe(true);
    expect(can("tools_manager", "calculators.toggle")).toBe(true);
    expect(can("tools_manager", "references.read")).toBe(false);
    expect(can("tools_manager", "references.write")).toBe(false);
    expect(can("tools_manager", "guides.write")).toBe(false);
    // tools_manager still reaches the Templars/Gems *reference* content, but only
    // through its calculators.write capability and the shared formula-params
    // editor at /admin/tools/{templars,gems}?from=referentiels (see
    // src/lib/admin-tools.ts's adminToolEditHref) — not through references.write.
    // That indirect path is intentional, not a gap in this role's permissions.
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

  // Bloc 59/A: admin used to inherit logs.purge from the generic
  // "everything except users.manage/content.*" filter — purge must be
  // reserved to super_admin alone, while read access to the log stays.
  it("Bloc59/A: reserves log purging to the Super Admin, while admin keeps read access", () => {
    expect(can("super_admin", "logs.purge")).toBe(true);
    expect(can("admin", "logs.purge")).toBe(false);
    expect(can("admin", "logs.view")).toBe(true);
  });

  // Bloc 59/B: read_only must have zero access to Historique and
  // Utilisateurs — not even read access — while keeping its 3 other
  // read-only sections (already covered by the "sections" loop above).
  it("Bloc59/B: keeps read_only out of the audit log and the users list entirely", () => {
    expect(can("read_only", "logs.view")).toBe(false);
    expect(can("read_only", "logs.purge")).toBe(false);
    expect(can("read_only", "users.read")).toBe(false);
    expect(can("read_only", "users.manage")).toBe(false);
    expect(can("read_only", "dashboard.view")).toBe(true);
  });

  it("reserves legal content reads and writes to the Super Admin", () => {
    for (const role of [
      "admin",
      "guides_manager",
      "references_manager",
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
