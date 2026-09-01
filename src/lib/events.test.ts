import { describe, expect, it } from "vitest";
import { emptyEventRow, emptyEventsCatalog, emptyEventTierRow } from "./events";
import { leagues } from "./player-settings";

describe("Bloc60: events data model", () => {
  it("starts with an empty event list for every league — no starting data", () => {
    for (const league of leagues) expect(emptyEventsCatalog[league]).toEqual([]);
  });

  it("gives every league its own independent array (no shared reference)", () => {
    for (const a of leagues)
      for (const b of leagues)
        if (a !== b) expect(emptyEventsCatalog[a]).not.toBe(emptyEventsCatalog[b]);
  });

  it("emptyEventRow starts with no tiers and empty fields", () => {
    expect(emptyEventRow).toEqual({
      name: "",
      startDay: "",
      endDay: "",
      tiers: [],
    });
  });

  it("emptyEventTierRow has both free-text fields empty, no structured sub-fields", () => {
    expect(emptyEventTierRow).toEqual({ objective: "", reward: "" });
  });
});
