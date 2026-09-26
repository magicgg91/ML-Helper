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

/**
 * Bloc 135 : une section peut s'ouvrir sur plusieurs capacités.
 *
 * Elle n'en demandait qu'une, et cela a tenu tant qu'un écran servait un seul
 * domaine. Configuration en sert désormais deux — les réglages du site, et
 * l'échelle des ligues et des divisions — dont les droits ne se recouvrent
 * pas : « Gestion Outils » a le second sans le premier. Une liste, et
 * l'entrée s'affiche dès que le rôle en tient une, ce qui est exactement ce
 * que la garde du serveur fait de son côté (`requireCapability` accepte déjà
 * un tableau).
 */
export type AdminSectionAccess = AdminCapability | readonly AdminCapability[];

export type AdminSection = {
  key: AdminSectionKey;
  href: string;
  group: AdminSectionGroup;
  read: AdminSectionAccess;
  /**
   * What it takes to change anything there. Absent on the dashboard, which
   * shows and does nothing.
   */
  write?: AdminSectionAccess;
};

/** Si ce rôle tient au moins une des capacités demandées. */
export function canAny(role: string, access: AdminSectionAccess): boolean {
  const list = Array.isArray(access) ? access : [access];
  return list.some((capability) => can(role, capability));
}

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
    // Bloc 135 : « Gestion Outils » n'a pas `configuration.read` et n'en veut
    // pas, mais il gère les ligues et les divisions, qui sont sur cet écran.
    read: ["configuration.read", "leagues.read"],
    write: ["configuration.write", "leagues.write"],
  },
];

export const adminSectionGroups: readonly AdminSectionGroup[] = [
  "main",
  "content",
  "access",
  "site",
];

/**
 * Bloc 135 : l'ancre de la section « Ligues et divisions » de Configuration.
 *
 * Deux endroits la nomment — la section elle-même, et la ligne Classement du
 * tableau Outils, qui dit désormais où ses paramètres se modifient. Écrite
 * deux fois, elle finirait par ne plus désigner la même chose.
 */
export const leaguesSectionAnchor = "ligues-divisions";
export const leaguesSectionHref = `/admin/config#${leaguesSectionAnchor}`;

/** The sections a role may open, and whether it may change anything there. */
export function roleSections(
  role: string,
): { section: AdminSection; canWrite: boolean }[] {
  return adminSections
    .filter((section) => canAny(role, section.read))
    .map((section) => ({
      section,
      canWrite: Boolean(section.write && canAny(role, section.write)),
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
