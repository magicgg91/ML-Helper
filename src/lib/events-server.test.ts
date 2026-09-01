import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { normalizeStoredValue } from "./events-server";
import { emptyEventsCatalog, type EventRow } from "./events";
import { leagues } from "./player-settings";

function allEvents(catalog: ReturnType<typeof normalizeStoredValue>) {
  return leagues.flatMap((league) => catalog[league]);
}

describe("Bloc60: events-server normalizeStoredValue", () => {
  it("falls back to the empty catalog when nothing is stored", () => {
    expect(normalizeStoredValue(null)).toEqual(emptyEventsCatalog);
    expect(normalizeStoredValue(undefined)).toEqual(emptyEventsCatalog);
  });

  it("passes a stored league -> events -> tiers shape through losslessly", () => {
    const legendEvent: EventRow = {
      name: "Recruteur",
      startDay: "1",
      endDay: "7",
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
    const stored = { ...emptyEventsCatalog, legend: [legendEvent] };
    const result = normalizeStoredValue(stored);
    expect(result.legend).toEqual([legendEvent]);
    // Entirely independent per league — untouched leagues stay empty.
    expect(result.bronze).toEqual([]);
    expect(result.gold).toEqual([]);
  });

  it("fills in a missing league as an empty array rather than dropping the whole catalog", () => {
    const stored = {
      bronze: [{ name: "X", startDay: "", endDay: "", tiers: [] }],
    };
    const result = normalizeStoredValue(stored);
    expect(result.bronze).toHaveLength(1);
    for (const league of leagues)
      if (league !== "bronze") expect(result[league]).toEqual([]);
  });

  it("tolerates malformed events and tiers instead of throwing", () => {
    const stored = {
      bronze: [null, "not an object", { name: "Ok", tiers: [null, 42] }],
    };
    const result = normalizeStoredValue(stored);
    expect(result.bronze).toHaveLength(1);
    expect(result.bronze[0].name).toBe("Ok");
    expect(result.bronze[0].tiers).toEqual([]);
  });

  it("defaults a missing/non-string field to an empty string instead of throwing", () => {
    const stored = {
      bronze: [{ tiers: [{ objective_fr: 5 }] }],
    };
    const result = normalizeStoredValue(stored);
    expect(result.bronze[0]).toMatchObject({
      name: "",
      startDay: "",
      endDay: "",
    });
    expect(result.bronze[0].tiers[0]).toEqual({
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

  // Same regression class as consumables-server.ts's Bloc 58 fix: a fresh
  // set of arrays every call, not the shared emptyEventsCatalog constant's
  // arrays — otherwise a row read in one call would leak into every other
  // call's result for that league.
  it("never shares league arrays across separate calls", () => {
    const withEvent = normalizeStoredValue({
      bronze: [{ name: "X", startDay: "", endDay: "", tiers: [] }],
    });
    const withoutEvent = normalizeStoredValue({});
    expect(withEvent.bronze).toHaveLength(1);
    expect(withoutEvent.bronze).toEqual([]);
  });
});
