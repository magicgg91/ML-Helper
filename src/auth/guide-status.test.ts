import { describe, expect, it } from "vitest";
import { canChangeGuideStatus } from "./guide-status";

describe("guide publication permissions", () => {
  it("lets guide managers prepare reviews but never publish or unpublish", () => {
    expect(
      canChangeGuideStatus("guides_manager", "draft", "pending_review"),
    ).toBe(true);
    expect(
      canChangeGuideStatus("guides_manager", "pending_review", "published"),
    ).toBe(false);
    expect(canChangeGuideStatus("guides_manager", "published", "draft")).toBe(
      false,
    );
  });

  it.each(["admin", "super_admin"])("lets %s publish and unpublish", (role) => {
    expect(canChangeGuideStatus(role, "pending_review", "published")).toBe(
      true,
    );
    expect(canChangeGuideStatus(role, "published", "draft")).toBe(true);
  });

  it("rejects calculator managers", () => {
    expect(
      canChangeGuideStatus("tools_manager", "draft", "pending_review"),
    ).toBe(false);
  });
});
