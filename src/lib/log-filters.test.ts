import { describe, expect, it } from "vitest";
import { buildLogsWhere, parseLogFilters } from "./log-filters";

describe("parseLogFilters", () => {
  it("trims values and drops blank ones", () => {
    expect(
      parseLogFilters({ user: "  alice  ", q: "   ", from: "2026-01-01" }),
    ).toEqual({
      user: "alice",
      message: undefined,
      from: "2026-01-01",
      to: undefined,
    });
  });

  it("takes the first value when a param is repeated in the URL", () => {
    expect(parseLogFilters({ user: ["alice", "bob"] })).toEqual(
      expect.objectContaining({ user: "alice" }),
    );
  });

  it("returns an empty filter set for an empty query", () => {
    expect(parseLogFilters({})).toEqual({
      user: undefined,
      message: undefined,
      from: undefined,
      to: undefined,
    });
  });
});

describe("buildLogsWhere", () => {
  it("builds no clause for an empty filter set", () => {
    expect(buildLogsWhere({})).toEqual({});
  });

  it("filters by username substring", () => {
    expect(buildLogsWhere({ user: "alice" })).toEqual({
      user: { username: { contains: "alice" } },
    });
  });

  it("filters by a word in the displayed message", () => {
    expect(buildLogsWhere({ message: "supprimé" })).toEqual({
      message: { contains: "supprimé" },
    });
  });

  it("filters by an inclusive date range", () => {
    const where = buildLogsWhere({ from: "2026-01-01", to: "2026-01-31" });
    expect(where.createdAt).toEqual({
      gte: new Date("2026-01-01T00:00:00.000"),
      lte: new Date("2026-01-31T23:59:59.999"),
    });
  });

  it("accepts an open-ended range with only a start date", () => {
    const where = buildLogsWhere({ from: "2026-01-01" });
    expect(where.createdAt).toEqual({
      gte: new Date("2026-01-01T00:00:00.000"),
    });
  });

  it("ignores a malformed date instead of throwing", () => {
    expect(buildLogsWhere({ from: "not-a-date" })).toEqual({});
  });

  it("combines every filter into a single where clause", () => {
    expect(
      buildLogsWhere({ user: "alice", message: "guide", from: "2026-01-01" }),
    ).toEqual({
      user: { username: { contains: "alice" } },
      message: { contains: "guide" },
      createdAt: { gte: new Date("2026-01-01T00:00:00.000") },
    });
  });
});
