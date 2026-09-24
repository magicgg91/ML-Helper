import { describe, expect, it } from "vitest";
import { resolvePopoverPosition } from "./admin-popover";

// A 1000×800 window, an anchor 120 wide and 34 tall, and a popover big
// enough to be a problem somewhere.
const viewport = { width: 1000, height: 800 };
const anchor = (left: number, top: number) => ({
  left,
  right: left + 120,
  top,
  bottom: top + 34,
});
const popover = { width: 200, height: 160 };

describe("Bloc 125 §3: where a popover ends up", () => {
  it("opens where it asked to, when there is room", () => {
    const at = resolvePopoverPosition({
      anchor: anchor(100, 100),
      popover,
      viewport,
      placement: "bottom-start",
    });
    expect(at.placement).toBe("bottom-start");
    expect(at.left).toBe(100);
    expect(at.top).toBe(140); // 134 (bottom) + 6 (gutter)
  });

  it("flips above the anchor when the bottom of the window is too close", () => {
    const at = resolvePopoverPosition({
      // 34 tall, sitting at 700: below it there are 66px, the popover is 160.
      anchor: anchor(100, 700),
      popover,
      viewport,
      placement: "bottom-start",
    });
    expect(at.placement).toBe("top-start");
    expect(at.top).toBe(534); // 700 - 6 - 160
  });

  it("flips below when it was asked to open above and cannot", () => {
    const at = resolvePopoverPosition({
      anchor: anchor(100, 20),
      popover,
      viewport,
      placement: "top-start",
    });
    expect(at.placement).toBe("bottom-start");
  });

  it("aligns on the other edge rather than overflowing to the right", () => {
    const at = resolvePopoverPosition({
      // The anchor runs 820→940: aligned on its left edge the popover would
      // end at 1020, twenty pixels outside the window.
      anchor: anchor(820, 100),
      popover,
      viewport,
      placement: "bottom-start",
    });
    expect(at.placement).toBe("bottom-end");
    expect(at.left).toBe(740); // 940 (right) - 200
  });

  it("keeps its preferred side when neither side can hold it", () => {
    // A window shorter than the popover: flipping would only move the
    // problem, so the popover stays where it was asked for and is clamped.
    const at = resolvePopoverPosition({
      anchor: anchor(100, 60),
      popover: { width: 200, height: 400 },
      viewport: { width: 1000, height: 300 },
      placement: "bottom-start",
    });
    expect(at.placement).toBe("bottom-start");
    // Clamped to the window rather than left hanging off the bottom.
    expect(at.top).toBe(8);
  });

  it("never comes closer than the margin to an edge", () => {
    const at = resolvePopoverPosition({
      anchor: { left: -40, right: 10, top: 0, bottom: 4 },
      popover,
      viewport,
      placement: "bottom-start",
    });
    expect(at.left).toBeGreaterThanOrEqual(8);
    expect(at.top).toBeGreaterThanOrEqual(8);
  });
});
