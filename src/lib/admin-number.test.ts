import { describe, expect, it } from "vitest";
import { formatAdminNumber, parseAdminNumber } from "./admin-number";

describe("Bloc 119: numbers in the admin's own language", () => {
  it("writes a decimal with the separator the language uses", () => {
    expect(formatAdminNumber(1.2453, "fr")).toBe("1,2453");
    expect(formatAdminNumber(1.2453, "en")).toBe("1.2453");
  });

  it("writes no thousands separator, so what is shown can be typed back", () => {
    expect(formatAdminNumber(1234567, "fr")).toBe("1234567");
    expect(formatAdminNumber(1234567, "en")).toBe("1234567");
  });

  it("shows nothing at all for a value nobody has confirmed yet", () => {
    // Not "0": an unknown game value stays unknown (AGENTS.md, pas
    // d'extrapolation).
    expect(formatAdminNumber(null, "fr")).toBe("");
    expect(formatAdminNumber(undefined, "fr")).toBe("");
  });

  it("reads both separators whatever the language", () => {
    expect(parseAdminNumber("1,2453")).toEqual({ ok: true, value: 1.2453 });
    expect(parseAdminNumber("1.2453")).toEqual({ ok: true, value: 1.2453 });
  });

  it("reads a number pasted with its groups", () => {
    expect(parseAdminNumber("1 234,5")).toEqual({ ok: true, value: 1234.5 });
    expect(parseAdminNumber("1 234,5")).toEqual({ ok: true, value: 1234.5 });
    expect(parseAdminNumber("1,234.5")).toEqual({ ok: true, value: 1234.5 });
    expect(parseAdminNumber("1.234,5")).toEqual({ ok: true, value: 1234.5 });
  });

  it("reads a field being typed in", () => {
    // Half a decimal is not an error yet — the user is still typing.
    expect(parseAdminNumber("1,")).toEqual({ ok: true, value: 1 });
    expect(parseAdminNumber("-")).toEqual({ ok: false });
  });

  it("calls an emptied field empty, never zero", () => {
    expect(parseAdminNumber("")).toEqual({ ok: true, value: null });
    expect(parseAdminNumber("   ")).toEqual({ ok: true, value: null });
  });

  it("refuses what is not a number instead of storing part of it", () => {
    expect(parseAdminNumber("1.2.3")).toEqual({ ok: false });
    expect(parseAdminNumber("abc")).toEqual({ ok: false });
    expect(parseAdminNumber("12px")).toEqual({ ok: false });
    expect(parseAdminNumber("Infinity")).toEqual({ ok: false });
  });

  it("round-trips a value through the display of either language", () => {
    for (const value of [0, 1, 0.5, 1.2453, -3.75, 1234567]) {
      for (const locale of ["fr", "en"]) {
        expect(parseAdminNumber(formatAdminNumber(value, locale))).toEqual({
          ok: true,
          value,
        });
      }
    }
  });
});
