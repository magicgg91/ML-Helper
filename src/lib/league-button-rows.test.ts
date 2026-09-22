import { describe, expect, it } from "vitest";
import { leagueButtonRows, sliceIntoRows } from "./league-button-rows";

const wide = (count: number) => leagueButtonRows(count, false);
const narrow = (count: number) => leagueButtonRows(count, true);

// Bloc 109, revised by Bloc 110/1: the picker's button count is whatever an
// admin has switched on since Bloc 108, so the layout is a formula over that
// count. These pin the counts the briefs name, and then the properties the
// formula is for — that it keeps holding past them.
describe("Bloc 110/1: the Classement league picker on a narrow screen", () => {
  // Two fixed columns, whatever the count. Bloc 109's narrow rule (three per
  // row, spread evenly) broke the page width in real conditions: a button
  // never truncates its label, and three division names do not fit across a
  // phone.
  it.each([
    [6, [2, 2, 2]],
    [7, [2, 2, 2, 1]],
    [8, [2, 2, 2, 2]],
    [10, [2, 2, 2, 2, 2]],
  ])("splits %i buttons as %j", (count, expected) => {
    expect(narrow(count)).toEqual(expected);
  });

  it("never puts a third button on a row", () => {
    for (let count = 1; count <= 60; count += 1)
      expect(
        Math.max(...narrow(count), 0),
        `${count} buttons`,
      ).toBeLessThanOrEqual(2);
  });

  it("fills every row but the last, which is short only when N is odd", () => {
    for (let count = 2; count <= 60; count += 1) {
      const rows = narrow(count);
      expect(rows.slice(0, -1), `${count} buttons`).toEqual(
        Array.from({ length: rows.length - 1 }, () => 2),
      );
      expect(rows[rows.length - 1], `${count} buttons, last row`).toBe(
        count % 2 === 0 ? 2 : 1,
      );
    }
  });

  it("uses as few rows as two per row allows", () => {
    for (let count = 1; count <= 60; count += 1)
      expect(narrow(count), `${count} buttons`).toHaveLength(
        Math.ceil(count / 2),
      );
  });
});

describe("Bloc 109: the same picker on desktop, untouched by Bloc 110", () => {
  it("leaves six or fewer on one row, as they have always been", () => {
    for (let count = 1; count <= 6; count += 1)
      expect(wide(count), `desktop ${count}`).toEqual([count]);
  });

  it.each([
    [7, [4, 3]],
    [8, [4, 4]],
    [9, [5, 4]],
    [10, [5, 5]],
  ])("splits %i over two rows as %j", (count, expected) => {
    expect(wide(count)).toEqual(expected);
  });

  it("never needs a third row, whatever the count", () => {
    for (let count = 7; count <= 60; count += 1)
      expect(wide(count), `${count} buttons`).toHaveLength(2);
  });

  it("keeps its two rows within one button of each other", () => {
    for (let count = 7; count <= 60; count += 1) {
      const rows = wide(count);
      expect(
        Math.max(...rows) - Math.min(...rows),
        `${count} buttons: ${rows.join("+")}`,
      ).toBeLessThanOrEqual(1);
    }
  });
});

it("places every button exactly once, on both layouts", () => {
  const total = (rows: number[]) => rows.reduce((sum, row) => sum + row, 0);
  for (let count = 1; count <= 60; count += 1) {
    expect(total(wide(count)), `desktop ${count}`).toBe(count);
    expect(total(narrow(count)), `mobile ${count}`).toBe(count);
  }
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
