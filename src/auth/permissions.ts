import type { AdminRole } from "./roles";

export const adminCapabilities = [
  "dashboard.view",
  "users.read",
  "users.manage",
  "logs.view",
  "logs.purge",
  "guides.read",
  "guides.write",
  "guides.publish",
  "guides.delete",
  "calculators.read",
  "calculators.write",
  "calculators.toggle",
  "references.read",
  "references.write",
  "content.read",
  "content.write",
] as const;

export type AdminCapability = (typeof adminCapabilities)[number];

const all = new Set<AdminCapability>(adminCapabilities);
const matrix: Record<AdminRole, ReadonlySet<AdminCapability>> = {
  super_admin: all,
  admin: new Set(
    adminCapabilities.filter(
      (item) =>
        item !== "users.manage" &&
        item !== "logs.purge" &&
        item !== "content.read" &&
        item !== "content.write",
    ),
  ),
  guides_manager: new Set(["dashboard.view", "guides.read", "guides.write"]),
  references_manager: new Set([
    "dashboard.view",
    "references.read",
    "references.write",
  ]),
  tools_manager: new Set([
    "dashboard.view",
    "calculators.read",
    "calculators.write",
    "calculators.toggle",
  ]),
  // Bloc 59/B: read_only is strictly limited to Dashboard/Tools/Références/
  // Guides in read-only — no Historique, no Utilisateurs (neither the nav
  // link nor a direct URL), and no indirect exposure of the audit history
  // via the dashboard's "dernières actions" section (gated by logs.view).
  read_only: new Set([
    "dashboard.view",
    "guides.read",
    "calculators.read",
    "references.read",
  ]),
};

export function can(role: string | undefined, capability: AdminCapability) {
  return Boolean(role && matrix[role as AdminRole]?.has(capability));
}
