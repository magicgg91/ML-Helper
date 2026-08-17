import type { AdminRole } from "./roles";

export const adminCapabilities = [
  "dashboard.view",
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
  admin: new Set(adminCapabilities.filter((item) => item !== "users.manage")),
  guides_manager: new Set(["dashboard.view", "guides.read", "guides.write"]),
  calculators_manager: new Set([
    "dashboard.view",
    "calculators.read",
    "calculators.write",
    "calculators.toggle",
    "references.read",
    "references.write",
  ]),
};

export function can(role: string | undefined, capability: AdminCapability) {
  return Boolean(role && matrix[role as AdminRole]?.has(capability));
}

export function capabilitiesFor(role: string | undefined) {
  return role
    ? (matrix[role as AdminRole] ?? new Set<AdminCapability>())
    : new Set<AdminCapability>();
}
