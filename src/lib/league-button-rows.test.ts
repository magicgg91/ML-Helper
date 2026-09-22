import { describe, expect, it } from "vitest";
import { leagueButtonRows, sliceIntoRows } from "./league-button-rows";

const wide = (count: number) => leagueButtonRows(count, false);
const narrow = (count: number) => leagueButtonRows(count, true);

// Bloc 109: the picker's button count is whatever an admin has switched on
// since Bloc 108, so the layout is a formula over that count. These pin the
// four counts the brief names, and then the property the formula is for —
// that it keeps holding past them.
describe("Bloc 109: how the Classement league picker splits its buttons", () => {
  it("leaves six or fewer on one row, as they have always been", () => {
    for (let count = 1; count <= 6; count += 1) {
      expect(wide(count), `desktop ${count}`).toEqual([count]);
      expect(narrow(count), `mobile ${count}`).toEqual([count]);
    }
  });

  it.each([
    [7, [4, 3]],
    [8, [4, 4]],
    [9, [5, 4]],
    [10, [5, 5]],
  ])("desktop splits %i over two rows as %j", (count, expected) => {
    expect(wide(count)).toEqual(expected);
  });

  it.each([
    [7, [3, 2, 2]],
    [8, [3, 3, 2]],
    [9, [3, 3, 3]],
    // The case the brief singles out: filling each row in turn would give
    // 3+3+3+1, a last row holding one button under three full ones.
    [10, [3, 3, 2, 2]],
  ])("mobile spreads %i evenly as %j", (count, expected) => {
    expect(narrow(count)).toEqual(expected);
  });

  it("never puts a fourth button on a narrow row", () => {
    for (let count = 7; count <= 60; count += 1)
      expect(
        Math.max(...narrow(count)),
        `${count} buttons`,
      ).toBeLessThanOrEqual(3);
  });

  it("never needs a third desktop row, whatever the count", () => {
    for (let count = 7; count <= 60; count += 1)
      expect(wide(count), `${count} buttons`).toHaveLength(2);
  });

  it("keeps narrow rows within one button of each other", () => {
    // What "evenly" means, stated as the property rather than as cases: no
    // row is ever more than one button shorter than another.
    for (let count = 7; count <= 60; count += 1) {
      const rows = narrow(count);
      expect(
        Math.max(...rows) - Math.min(...rows),
        `${count} buttons: ${rows.join("+")}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("places every button exactly once, on both layouts", () => {
    const total = (rows: number[]) => rows.reduce((sum, row) => sum + row, 0);
    for (let count = 1; count <= 60; count += 1) {
      expect(total(wide(count)), `desktop ${count}`).toBe(count);
      expect(total(narrow(count)), `mobile ${count}`).toBe(count);
    }
  });

  it("uses as few narrow rows as three per row allows", () => {
    for (let count = 7; count <= 60; count += 1)
      expect(narrow(count), `${count} buttons`).toHaveLength(
        Math.ceil(count / 3),
      );
  });
});

describe("sliceIntoRows", () => {
  it("cuts a list into the rows it was given, in order", () => {
    expect(sliceIntoRows(["a", "b", "c", "d", "e"], [3, 2])).toEqual([
      ["a", "b", "c"],
      ["d", "e"],
    ]);
  });

  it("carries every item across, still in order", () => {
    const items = Array.from({ length: 10 }, (_, index) => index);
    expect(sliceIntoRows(items, leagueButtonRows(10, true)).flat()).toEqual(
      items,
    );
  });
});
