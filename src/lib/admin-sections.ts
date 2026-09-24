import { can, type AdminCapability } from "@/auth/permissions";

/**
 * Bloc 119: the eight sections of the admin, with the capability that opens
 * each one and the one that writes in it.
 *
 * One table, two readers. The side column filters its entries with it — a
 * link that appears is a page that opens, because it is the same `can()` the
 * server guard uses. And the Users screen describes each role from it: the
 * one-line description under a role's radio button is computed from the
 * matrix rather than written by hand, so it cannot drift from what the role
 * can actually do (Bloc 119 §3, "déduite de la matrice de permissions
 * réelle").
 */

export type AdminSectionKey =
  | "dashboard"
  | "tools"
  | "referentiels"
  | "guides"
  | "content"
  | "users"
  | "logs"
  | "config";

/** The groups of the side column; "main" carries no heading (§2). */
export type AdminSectionGroup = "main" | "content" | "access" | "site";

export type AdminSection = {
  key: AdminSectionKey;
  href: string;
  group: AdminSectionGroup;
  read: AdminCapability;
  /**
   * What it takes to change anything there. Absent on the dashboard, which
   * shows and does nothing.
   */
  write?: AdminCapability;
};

export const adminSections: readonly AdminSection[] = [
  {
    key: "dashboard",
    href: "/admin",
    group: "main",
    read: "dashboard.view",
  },
  {
    key: "tools",
    href: "/admin/tools",
    group: "content",
    read: "calculators.read",
    write: "calculators.write",
  },
  {
    key: "referentiels",
    href: "/admin/referentiels",
    group: "content",
    read: "references.read",
    write: "references.write",
  },
  {
    key: "guides",
    href: "/admin/guides",
    group: "content",
    read: "guides.read",
    write: "guides.write",
  },
  {
    key: "content",
    href: "/admin/content",
    group: "content",
    read: "content.read",
    write: "content.write",
  },
  {
    key: "users",
    href: "/admin/users",
    group: "access",
    read: "users.read",
    write: "users.manage",
  },
  {
    key: "logs",
    href: "/admin/logs",
    group: "access",
    read: "logs.view",
    write: "logs.purge",
  },
  {
    key: "config",
    href: "/admin/config",
    group: "site",
    read: "configuration.read",
    write: "configuration.write",
  },
];

export const adminSectionGroups: readonly AdminSectionGroup[] = [
  "main",
  "content",
  "access",
  "site",
];

/** The sections a role may open, and whether it may change anything there. */
export function roleSections(
  role: string,
): { section: AdminSection; canWrite: boolean }[] {
  return adminSections
    .filter((section) => can(role, section.read))
    .map((section) => ({
      section,
      canWrite: Boolean(section.write && can(role, section.write)),
    }));
}

/** True when a role may open sections but change nothing in any of them. */
export function isReadOnlyRole(role: string): boolean {
  const sections = roleSections(role);
  return sections.length > 0 && sections.every(({ canWrite }) => !canWrite);
}

/**
 * What a role may change, and what it may only look at — the two lists the
 * Users screen turns into the one-line description under each role's radio
 * button (Bloc 119 §3).
 *
 * The dashboard is left out of both: every role can open it, and it says
 * nothing about what the role is for.
 */
export function roleSectionSummary(role: string): {
  writable: AdminSectionKey[];
  readable: AdminSectionKey[];
} {
  const sections = roleSections(role).filter(
    ({ section }) => section.key !== "dashboard",
  );
  return {
    writable: sections
      .filter(({ canWrite }) => canWrite)
      .map(({ section }) => section.key),
    readable: sections
      .filter(({ canWrite }) => !canWrite)
      .map(({ section }) => section.key),
  };
}
