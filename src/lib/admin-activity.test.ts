import { describe, expect, it } from "vitest";
import { groupConsecutiveActivity, type ActivityEntry } from "./admin-activity";

const entry = (
  id: string,
  author: string,
  message: string,
  minutes: number,
): ActivityEntry => ({
  id,
  author,
  message,
  at: new Date(Date.UTC(2026, 8, 22, 18, minutes)),
});

describe("Bloc 119: folding a run of identical actions", () => {
  it("keeps one line per distinct action", () => {
    const groups = groupConsecutiveActivity([
      entry("1", "rootadmin", "a modifié les Gemmes", 12),
      entry("2", "rootadmin", "a publié un guide", 8),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.times)).toEqual([
      [new Date(Date.UTC(2026, 8, 22, 18, 12))],
      [new Date(Date.UTC(2026, 8, 22, 18, 8))],
    ]);
  });

  it("folds a run of the same action by the same author", () => {
    // Five saves of one table in four minutes: one line, five times.
    const groups = groupConsecutiveActivity([
      entry("5", "rootadmin", "a modifié les Gemmes", 12),
      entry("4", "rootadmin", "a modifié les Gemmes", 11),
      entry("3", "rootadmin", "a modifié les Gemmes", 8),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("5");
    expect(groups[0].times).toHaveLength(3);
  });

  it("does not fold across somebody else's action", () => {
    // What happened in between is part of the story: two runs, not one.
    const groups = groupConsecutiveActivity([
      entry("3", "rootadmin", "a modifié les Gemmes", 12),
      entry("2", "claire", "a publié un guide", 10),
      entry("1", "rootadmin", "a modifié les Gemmes", 8),
    ]);
    expect(groups.map((group) => group.author)).toEqual([
      "rootadmin",
      "claire",
      "rootadmin",
    ]);
  });

  it("does not fold the same sentence from two authors", () => {
    const groups = groupConsecutiveActivity([
      entry("2", "claire", "a modifié les Gemmes", 12),
      entry("1", "rootadmin", "a modifié les Gemmes", 11),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("returns nothing for an empty log", () => {
    expect(groupConsecutiveActivity([])).toEqual([]);
  });

  it("keeps the order it was given, newest first", () => {
    const groups = groupConsecutiveActivity([
      entry("3", "rootadmin", "c", 12),
      entry("2", "rootadmin", "b", 11),
      entry("1", "rootadmin", "a", 10),
    ]);
    expect(groups.map((group) => group.message)).toEqual(["c", "b", "a"]);
  });
});
