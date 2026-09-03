import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { normalizeStoredValue } from "./events-server";
import { emptyEventsCatalog, type EventRow } from "./events";
import { leagues } from "./player-settings";

function allEvents(catalog: ReturnType<typeof normalizeStoredValue>) {
  return leagues.flatMap((league) => catalog[league].events);
}

describe("Bloc60/77: events-server normalizeStoredValue", () => {
  it("falls back to the empty catalog when nothing is stored", () => {
    expect(normalizeStoredValue(null)).toEqual(emptyEventsCatalog);
    expect(normalizeStoredValue(undefined)).toEqual(emptyEventsCatalog);
  });

  it("passes a stored league -> {seasonDurationDays, events -> tiers} shape through losslessly", () => {
    const legendEvent: EventRow = {
      name: "Recruteur",
      description_fr: "Enrôle des troupes",
      description_en: "Enlist troops",
      duration: 72,
      tiers: [
        {
          objective_fr: "1G troupes enrôlées",
          objective_en: "1B troops enlisted",
          reward_fr: "100M or + 250 éclats",
          reward_en: "100M gold + 250 shards",
        },
        {
          objective_fr: "3G troupes enrôlées",
          objective_en: "3B troops enlisted",
          reward_fr: "300M or + 5 saphirs",
          reward_en: "300M gold + 5 sapphires",
        },
      ],
    };
    const stored = {
      ...emptyEventsCatalog,
      legend: { seasonDurationDays: 14, events: [legendEvent] },
    };
    const result = normalizeStoredValue(stored);
    expect(result.legend).toEqual({
      seasonDurationDays: 14,
      events: [legendEvent],
    });
    // Entirely independent per league — untouched leagues stay empty.
    expect(result.bronze.events).toEqual([]);
    expect(result.gold.events).toEqual([]);
  });

  it("Bloc77/C: normalizes an invalid/missing seasonDurationDays back to that league's own default", () => {
    const result = normalizeStoredValue({
      bronze: { seasonDurationDays: -5, events: [] },
      legend: { seasonDurationDays: "not a number", events: [] },
      gold: { events: [] },
    });
    expect(result.bronze.seasonDurationDays).toBe(
      emptyEventsCatalog.bronze.seasonDurationDays,
    );
    expect(result.legend.seasonDurationDays).toBe(
      emptyEventsCatalog.legend.seasonDurationDays,
    );
    expect(result.gold.seasonDurationDays).toBe(
      emptyEventsCatalog.gold.seasonDurationDays,
    );
  });

  it("Bloc77/B: normalizes an invalid/missing duration back to the first valid value (24h), never startDay/endDay", () => {
    const result = normalizeStoredValue({
      bronze: {
        seasonDurationDays: 21,
        events: [
          { name: "A", duration: 999, tiers: [] },
          { name: "B", tiers: [] },
        ],
      },
    });
    expect(result.bronze.events[0].duration).toBe(24);
    expect(result.bronze.events[1].duration).toBe(24);
    expect(result.bronze.events[0]).not.toHaveProperty("startDay");
    expect(result.bronze.events[0]).not.toHaveProperty("endDay");
  });

  it("fills in a missing league as an empty event list with its own default season duration, rather than dropping the whole catalog", () => {
    const stored = {
      bronze: {
        seasonDurationDays: 21,
        events: [{ name: "X", description_fr: "", description_en: "", duration: 24, tiers: [] }],
      },
    };
    const result = normalizeStoredValue(stored);
    expect(result.bronze.events).toHaveLength(1);
    for (const league of leagues)
      if (league !== "bronze") {
        expect(result[league].events).toEqual([]);
        expect(result[league].seasonDurationDays).toBe(
          emptyEventsCatalog[league].seasonDurationDays,
        );
      }
  });

  it("tolerates malformed events and tiers instead of throwing", () => {
    const stored = {
      bronze: {
        seasonDurationDays: 21,
        events: [null, "not an object", { name: "Ok", tiers: [null, 42] }],
      },
    };
    const result = normalizeStoredValue(stored);
    expect(result.bronze.events).toHaveLength(1);
    expect(result.bronze.events[0].name).toBe("Ok");
    expect(result.bronze.events[0].tiers).toEqual([]);
  });

  it("defaults a missing/non-string field to an empty string instead of throwing", () => {
    const stored = {
      bronze: { seasonDurationDays: 21, events: [{ tiers: [{ objective_fr: 5 }] }] },
    };
    const result = normalizeStoredValue(stored);
    expect(result.bronze.events[0]).toMatchObject({
      name: "",
      description_fr: "",
      description_en: "",
      duration: 24,
    });
    expect(result.bronze.events[0].tiers[0]).toEqual({
      objective_fr: "",
      objective_en: "",
      reward_fr: "",
      reward_en: "",
    });
  });

  it("ignores a non-object stored value and falls back to the empty catalog", () => {
    expect(allEvents(normalizeStoredValue("not an object"))).toHaveLength(0);
    expect(allEvents(normalizeStoredValue(42))).toHaveLength(0);
  });

  it("ignores a non-object league entry and falls back to that league's own empty default", () => {
    const result = normalizeStoredValue({ bronze: ["not an object either"] });
    expect(result.bronze).toEqual({
      seasonDurationDays: emptyEventsCatalog.bronze.seasonDurationDays,
      events: [],
    });
  });

  // Same regression class as consumables-server.ts's Bloc 58 fix: a fresh
  // set of arrays every call, not the shared emptyEventsCatalog constant's
  // arrays — otherwise a row read in one call would leak into every other
  // call's result for that league.
  it("never shares league arrays across separate calls", () => {
    const withEvent = normalizeStoredValue({
      bronze: {
        seasonDurationDays: 21,
        events: [{ name: "X", description_fr: "", description_en: "", duration: 24, tiers: [] }],
      },
    });
    const withoutEvent = normalizeStoredValue({});
    expect(withEvent.bronze.events).toHaveLength(1);
    expect(withoutEvent.bronze.events).toEqual([]);
  });
});
