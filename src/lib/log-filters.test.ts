import { describe, expect, it } from "vitest";
import {
  buildLogsWhere,
  logsPageHref,
  parseLogFilters,
  parseLogPage,
} from "./log-filters";

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

describe("parseLogPage", () => {
  it("defaults to page 1 when no page param is present", () => {
    expect(parseLogPage({})).toBe(1);
  });

  it("parses a valid page number", () => {
    expect(parseLogPage({ page: "3" })).toBe(3);
  });

  it("falls back to page 1 for a non-numeric or non-positive value", () => {
    expect(parseLogPage({ page: "not-a-number" })).toBe(1);
    expect(parseLogPage({ page: "0" })).toBe(1);
    expect(parseLogPage({ page: "-2" })).toBe(1);
  });

  it("takes the first value when the param is repeated", () => {
    expect(parseLogPage({ page: ["2", "5"] })).toBe(2);
  });
});

describe("logsPageHref", () => {
  it("links to the plain logs page for page 1 with no filters", () => {
    expect(logsPageHref({}, 1)).toBe("/admin/logs");
  });

  it("omits the page param for page 1 but keeps filters", () => {
    expect(logsPageHref({ user: "alice" }, 1)).toBe("/admin/logs?user=alice");
  });

  it("includes the page param and every active filter", () => {
    expect(
      logsPageHref(
        {
          user: "alice",
          message: "guide",
          from: "2026-01-01",
          to: "2026-01-31",
        },
        2,
      ),
    ).toBe(
      "/admin/logs?user=alice&q=guide&from=2026-01-01&to=2026-01-31&page=2",
    );
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
