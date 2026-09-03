import { describe, expect, it } from "vitest";
import {
  emptyEventRow,
  emptyEventsCatalog,
  emptyEventTierRow,
  totalEventHours,
} from "./events";
import { leagues } from "./player-settings";

describe("Bloc60/77: events data model", () => {
  it("starts with an empty event list and a reasonable default season duration for every league", () => {
    for (const league of leagues) {
      expect(emptyEventsCatalog[league].events).toEqual([]);
      expect(emptyEventsCatalog[league].seasonDurationDays).toBeGreaterThan(0);
    }
  });

  it("Bloc77/C: defaults Bronze's season to 21 days and every other league to 14, matching the cdc", () => {
    expect(emptyEventsCatalog.bronze.seasonDurationDays).toBe(21);
    for (const league of leagues)
      if (league !== "bronze")
        expect(emptyEventsCatalog[league].seasonDurationDays).toBe(14);
  });

  it("gives every league its own independent event array (no shared reference)", () => {
    for (const a of leagues)
      for (const b of leagues)
        if (a !== b)
          expect(emptyEventsCatalog[a].events).not.toBe(
            emptyEventsCatalog[b].events,
          );
  });

  // Bloc 77/B: startDay/endDay are gone entirely, replaced by a single
  // fixed-enum duration field — events chain back-to-back within a season.
  it("Bloc77/B: emptyEventRow starts with a valid duration, no tiers, no trace of startDay/endDay", () => {
    expect(emptyEventRow).toEqual({
      name: "",
      description_fr: "",
      description_en: "",
      duration: 24,
      tiers: [],
    });
    expect(emptyEventRow).not.toHaveProperty("startDay");
    expect(emptyEventRow).not.toHaveProperty("endDay");
  });

  it("emptyEventTierRow has both fr/en free-text fields empty, no structured sub-fields", () => {
    expect(emptyEventTierRow).toEqual({
      objective_fr: "",
      objective_en: "",
      reward_fr: "",
      reward_en: "",
    });
  });

  // Bloc 77 review (Codex PR #95): the admin editor and the PUT route both
  // need the same cumulative-hours figure to reject a schedule overrunning
  // its own season — a small shared helper instead of duplicating the sum.
  it("totalEventHours sums every event's duration, 0 for an empty list", () => {
    expect(totalEventHours([])).toBe(0);
    expect(
      totalEventHours([
        { ...emptyEventRow, duration: 72 },
        { ...emptyEventRow, duration: 72 },
        { ...emptyEventRow, duration: 24 },
      ]),
    ).toBe(168);
  });
});
