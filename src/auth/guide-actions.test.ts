import { describe, expect, it } from "vitest";
import { canPerformGuideAction, type GuideAction } from "./guide-actions";

const actions: GuideAction[] = [
  "create",
  "edit",
  "toggle",
  "submit_review",
  "publish",
  "delete",
];

describe("guide action permissions", () => {
  it.each(["super_admin", "admin"])("allows every action to %s", (role) => {
    for (const action of actions)
      expect(canPerformGuideAction(role, action)).toBe(true);
  });

  it("limits guide managers to authoring, review submission and visibility", () => {
    for (const action of ["create", "edit", "toggle", "submit_review"] as const)
      expect(canPerformGuideAction("guides_manager", action)).toBe(true);
    expect(canPerformGuideAction("guides_manager", "publish")).toBe(false);
    expect(canPerformGuideAction("guides_manager", "delete")).toBe(false);
  });

  it("refuses every guide action to tools managers and read-only users", () => {
    for (const action of actions) {
      expect(canPerformGuideAction("tools_manager", action)).toBe(false);
      expect(canPerformGuideAction("read_only", action)).toBe(false);
    }
  });
});
