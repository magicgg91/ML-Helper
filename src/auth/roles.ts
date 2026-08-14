export const roles = [
  "super_admin",
  "admin",
  "guides_manager",
  "calculators_manager",
] as const;
export type AdminRole = (typeof roles)[number];
export function isAdminRole(value: string): value is AdminRole {
  return roles.includes(value as AdminRole);
}
export function isSuperAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}
