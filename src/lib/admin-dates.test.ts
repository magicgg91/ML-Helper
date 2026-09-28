import { describe, expect, it } from "vitest";
import {
  adminDayKey,
  adminTimeZone,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminDayHeading,
  formatAdminShortDate,
  formatAdminTime,
} from "./admin-dates";

/**
 * Bloc 119: these tests are about the time zone as much as the wording. The
 * bug they close is not cosmetic — an action taken at 20:04 in Paris was
 * logged as 18:04, because the Docker container runs in UTC and nothing said
 * otherwise.
 */

// 22 September 2026, 18:04:11 UTC — 20:04 in Paris (CEST, summer time).
const summerEvening = new Date("2026-09-22T18:04:11.314Z");
// 15 January 2026, 23:30 UTC — already 00:30 on the 16th in Paris (CET).
const winterNight = new Date("2026-01-15T23:30:00.000Z");

describe("Bloc 119: the admin reads its dates in Europe/Paris", () => {
  it("names the site's zone rather than the container's", () => {
    expect(adminTimeZone).toBe("Europe/Paris");
  });

  it("shifts a summer instant by two hours, not zero", () => {
    // The UTC hour is 18; the admin shows the hour the moderator experienced.
    expect(formatAdminTime(summerEvening, "fr")).toBe("20:04");
    expect(formatAdminTime(summerEvening, "en")).toBe("20:04");
  });

  it("shifts a winter instant by one hour, so the offset is not hardcoded", () => {
    expect(formatAdminTime(winterNight, "fr")).toBe("00:30");
  });

  it("keeps the 24-hour clock in English too", () => {
    // 15:00 in Paris — an en-US reader would get "3:00 PM" by default, a
    // different column width and a different sort order at a glance.
    expect(formatAdminTime(new Date("2026-09-22T13:00:00Z"), "en")).toBe(
      "15:00",
    );
  });
});

describe("Bloc 119: the wording follows the interface language", () => {
  it("writes the full date the way each language does", () => {
    expect(formatAdminDate(summerEvening, "fr")).toBe("22/09/2026");
    expect(formatAdminDate(summerEvening, "en")).toBe("09/22/2026");
  });

  it("shortens a list column to a day and a month", () => {
    expect(formatAdminShortDate(summerEvening, "fr")).toBe("22 sept.");
    expect(formatAdminShortDate(summerEvening, "en")).toBe("Sep 22");
  });

  it("joins date and time for a single-row summary", () => {
    expect(formatAdminDateTime(summerEvening, "fr")).toBe("22/09/2026 20:04");
  });

  it("raises the first letter of a day heading, with the locale's own casing", () => {
    // French writes "mardi 22 septembre 2026"; the heading opens a line.
    expect(formatAdminDayHeading(summerEvening, "fr")).toBe(
      "Mardi 22 septembre 2026",
    );
    // English already capitalises it — the helper must not double-shift or
    // otherwise disturb a locale that needs nothing.
    expect(formatAdminDayHeading(summerEvening, "en")).toBe(
      "Tuesday, September 22, 2026",
    );
  });
});

describe("Bloc 119: grouping the audit log by day", () => {
  it("keys an instant on its Paris day, not its UTC day", () => {
    // 23:30 UTC is already tomorrow in Paris. Grouping on the UTC date would
    // file the two halves of one evening under two headings.
    expect(adminDayKey(winterNight)).toBe("2026-01-16");
    expect(adminDayKey(summerEvening)).toBe("2026-09-22");
  });

  it("produces keys that sort chronologically as plain strings", () => {
    const keys = [
      adminDayKey("2026-09-22T18:04:11Z"),
      adminDayKey("2026-01-15T23:30:00Z"),
      adminDayKey("2026-10-03T06:00:00Z"),
    ];
    expect([...keys].sort()).toEqual([
      "2026-01-16",
      "2026-09-22",
      "2026-10-03",
    ]);
  });
});

describe("Bloc 119: what the helpers accept", () => {
  it("takes the Date Prisma returns and the ISO string it becomes", () => {
    // A server component that hands a row to a client one serialises the
    // Date; both sides must print the same thing.
    expect(formatAdminDateTime(summerEvening.toISOString(), "fr")).toBe(
      formatAdminDateTime(summerEvening, "fr"),
    );
    expect(formatAdminDate(summerEvening.getTime(), "fr")).toBe("22/09/2026");
  });

  it("refuses an unparsable value instead of printing 'Invalid Date'", () => {
    expect(() => formatAdminDate("pas une date", "fr")).toThrow(
      /Date invalide/,
    );
    expect(() => adminDayKey(Number.NaN)).toThrow(/Date invalide/);
  });
});
