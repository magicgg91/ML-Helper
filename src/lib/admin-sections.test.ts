import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  adminSections,
  isReadOnlyRole,
  roleSections,
  type AdminSectionKey,
} from "./admin-sections";
import { can } from "@/auth/permissions";
import { roles } from "@/auth/roles";

const keysOf = (role: string): AdminSectionKey[] =>
  roleSections(role).map(({ section }) => section.key);

describe("Bloc 119: the sections of the admin", () => {
  it("covers every screen the admin actually has", () => {
    // A page added under /admin without an entry here would be reachable by
    // URL and invisible in the navigation — this is what catches that.
    const directories = readdirSync(path.join(process.cwd(), "src/app/admin"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      // The one-time Super Admin creation screen is reached before any
      // account exists, so it belongs to no role's navigation.
      .filter((name) => name !== "setup");
    const hrefs = new Set(adminSections.map((section) => section.href));
    for (const directory of directories)
      expect(hrefs, `/admin/${directory} n'a pas d'entrée`).toContain(
        `/admin/${directory}`,
      );
    // …and the dashboard, which is the directory's own page.
    expect(hrefs).toContain("/admin");
  });

  it("gives every section a distinct address", () => {
    const hrefs = adminSections.map((section) => section.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("Bloc 119: what each role may open and change", () => {
  it("opens everything for a Super Admin", () => {
    expect(keysOf("super_admin")).toEqual([
      "dashboard",
      "tools",
      "referentiels",
      "guides",
      "content",
      "users",
      "logs",
      "config",
    ]);
    for (const { section, canWrite } of roleSections("super_admin"))
      if (section.write) expect(canWrite, section.key).toBe(true);
  });

  it("separates an Admin from a Super Admin on three points", () => {
    // The difference the Users screen has to spell out: an Admin does not
    // see the legal pages at all, and may neither manage accounts nor purge
    // the audit log, though it opens both screens.
    expect(keysOf("admin")).not.toContain("content");
    const sections = new Map(
      roleSections("admin").map(({ section, canWrite }) => [
        section.key,
        canWrite,
      ]),
    );
    expect(sections.get("users")).toBe(false);
    expect(sections.get("logs")).toBe(false);
    expect(sections.get("guides")).toBe(true);
  });

  it("limits each manager role to its own section", () => {
    expect(keysOf("guides_manager")).toEqual(["dashboard", "guides"]);
    expect(keysOf("references_manager")).toEqual(["dashboard", "referentiels"]);
    expect(keysOf("tools_manager")).toEqual(["dashboard", "tools"]);
    for (const role of [
      "guides_manager",
      "references_manager",
      "tools_manager",
    ])
      expect(isReadOnlyRole(role), role).toBe(false);
  });

  it("recognises the role that may change nothing anywhere", () => {
    expect(keysOf("read_only")).toEqual([
      "dashboard",
      "tools",
      "referentiels",
      "guides",
    ]);
    expect(isReadOnlyRole("read_only")).toBe(true);
    // Bloc 59/B: no Historique and no Utilisateurs for this role, not even
    // in reading.
    expect(keysOf("read_only")).not.toContain("logs");
    expect(keysOf("read_only")).not.toContain("users");
  });

  it("says nothing at all about someone with no admin role", () => {
    expect(roleSections("visiteur")).toEqual([]);
    expect(isReadOnlyRole("visiteur")).toBe(false);
  });

  it("agrees with the capability matrix for every role and section", () => {
    // The descriptions and the navigation are computed from this, so the
    // two have to be the same statement, not two readings of it.
    for (const role of roles)
      for (const section of adminSections) {
        const listed = roleSections(role).find(
          ({ section: candidate }) => candidate.key === section.key,
        );
        expect(Boolean(listed), `${role}/${section.key}`).toBe(
          can(role, section.read),
        );
      }
  });
});
