import { describe, expect, it } from "vitest";
import {
  emptyEventRow,
  emptyEventsCatalog,
  emptyEventTierRow,
  eventColors,
  eventColorVar,
  timelineLabelMaxWidthRem,
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
      color: "violet",
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

  // Bloc 80/F: revises Bloc 79/G's auto-derived-from-name color entirely —
  // a fixed, exactly-10-option palette (5 base hues x 2 shades) the admin
  // picks from directly, never --gold (color-palette.test.ts: reserved for
  // legendary-rarity data only).
  it("Bloc80/F: eventColors is a fixed 10-option palette, 5 base hues x 2 shades, never gold", () => {
    expect(eventColors).toHaveLength(10);
    expect(new Set(eventColors).size).toBe(10); // every option distinct.
    for (const color of eventColors) {
      expect(color).not.toMatch(/^gold/);
      // Bloc 81/B: a dedicated --event-* namespace (globals.css), not the
      // shared --violet/--emerald/etc. tokens Bloc 80 originally drew from
      // — those are tuned for their own jobs elsewhere and read as too
      // dark/muted once used as 10 standalone swatches.
      expect(eventColorVar(color)).toBe(`var(--event-${color})`);
    }
  });

  // Bloc 80/G: the timeline label's max-width is proportional to the
  // segment's own share of the season (a wider box for a wider segment)
  // instead of Bloc 79/E's flat 9rem cap, with a floor and a ceiling so it
  // never collapses to unreadable or balloons past a sane size.
  it("Bloc80/G: timelineLabelMaxWidthRem grows with the segment's own width, within a floor and a ceiling", () => {
    // A 72h event in a typical 14-day (336h) season — ~21.4% wide.
    const wideSegment = (72 / 336) * 100;
    // A 24h event in Bronze's 21-day (504h) season — ~4.76% wide.
    const narrowSegment = (24 / 504) * 100;
    expect(timelineLabelMaxWidthRem(wideSegment)).toBeGreaterThan(
      timelineLabelMaxWidthRem(narrowSegment),
    );
    expect(timelineLabelMaxWidthRem(narrowSegment)).toBeGreaterThanOrEqual(4.5); // floor.
    expect(timelineLabelMaxWidthRem(100)).toBeLessThanOrEqual(15); // ceiling.
  });
});
