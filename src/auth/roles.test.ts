import { describe, expect, it } from "vitest";
import { isAdminRole, isSuperAdmin, roles } from "./roles";
describe("admin roles", () => {
  it("accepts exactly the five configured roles", () => {
    expect(roles).toHaveLength(5);
    expect(roles.every(isAdminRole)).toBe(true);
    expect(isAdminRole("visitor")).toBe(false);
  });
  it("restricts super admin operations", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("admin")).toBe(false);
  });
});
