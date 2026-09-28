import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("./prisma", () => ({ prisma: { localeSetting: { findMany } } }));

import { editorialLocales } from "../components/editorial-locale-select";
import { launchLocales } from "./translations";
import {
  alwaysActiveLocales,
  deactivatableLocales,
  getActiveLocales,
  getLocaleActiveState,
  isAlwaysActiveLocale,
  isDeactivatableLocale,
  resolveRenderLocale,
} from "./locale-settings";

beforeEach(() => findMany.mockReset());

// Bloc 90/E: which locale a page renders in, given the NEXT_LOCALE cookie and
// the active-locale set. Pure, so it needs no request pipeline.
describe("resolveRenderLocale (Bloc 90/E)", () => {
  const active = ["fr", "en", "de"];
  it("uses the site default (fr) on a first visit with no cookie", () => {
    expect(resolveRenderLocale(undefined, active)).toBe("fr");
  });
  it("keeps an active cookie locale", () => {
    expect(resolveRenderLocale("de", active)).toBe("de");
    expect(resolveRenderLocale("en", active)).toBe("en");
  });
  it("sends a now-disabled cookie locale to English, never the default", () => {
    expect(resolveRenderLocale("es", active)).toBe("en");
    expect(resolveRenderLocale("tr", active)).toBe("en");
  });
  it("sends an unknown cookie locale to English", () => {
    expect(resolveRenderLocale("xx", active)).toBe("en");
  });
});

// Bloc 90/D: EN and FR are the always-active base; only DE/ES/TR toggle.
describe("locked vs deactivatable locales (Bloc 90/D)", () => {
  it("locks exactly EN and FR", () => {
    expect([...alwaysActiveLocales].sort()).toEqual(["en", "fr"]);
    expect(isAlwaysActiveLocale("en")).toBe(true);
    expect(isAlwaysActiveLocale("fr")).toBe(true);
    expect(isAlwaysActiveLocale("de")).toBe(false);
  });
  // Bloc 120: "everything but the EN/FR base" rather than the three names —
  // the guardrail is the same, but a language added as a messages/*.json file
  // no longer makes this red.
  it("makes every launched locale but the EN/FR base deactivatable", () => {
    expect([...deactivatableLocales].sort()).toEqual(
      launchLocales.filter((locale) => !isAlwaysActiveLocale(locale)).sort(),
    );
    expect(deactivatableLocales).not.toHaveLength(0);
    expect(isDeactivatableLocale("de")).toBe(true);
    expect(isDeactivatableLocale("en")).toBe(false);
    expect(isDeactivatableLocale("fr")).toBe(false);
  });
});

describe("getLocaleActiveState / getActiveLocales", () => {
  it("defaults every launched locale to active when nothing is stored", async () => {
    findMany.mockResolvedValue([]);
    expect(await getLocaleActiveState()).toEqual(
      Object.fromEntries(launchLocales.map((locale) => [locale, true])),
    );
    expect(await getActiveLocales()).toEqual([...launchLocales]);
  });

  it("hides a deactivated locale from the active list (Bloc 90/B+C)", async () => {
    findMany.mockResolvedValue([{ locale: "de", active: false }]);
    expect((await getLocaleActiveState()).de).toBe(false);
    expect(await getActiveLocales()).toEqual(
      launchLocales.filter((locale) => locale !== "de"),
    );
  });

  it("forces EN/FR active even if a stored row says otherwise (Bloc 90/D)", async () => {
    findMany.mockResolvedValue([
      { locale: "en", active: false },
      { locale: "fr", active: false },
    ]);
    const state = await getLocaleActiveState();
    expect(state.en).toBe(true);
    expect(state.fr).toBe(true);
    const activeLocales = await getActiveLocales();
    expect(activeLocales).toContain("en");
    expect(activeLocales).toContain("fr");
  });
});

// Bloc 90/F: the admin editorial locale picker (per-field content language) is
// independent of public visibility — it always offers all 5 launched locales,
// so admins can keep editing content in a language that's been hidden from the
// public site.
describe("editorial locales stay all five (Bloc 90/F)", () => {
  it("never filters by active state", () => {
    expect(editorialLocales).toEqual(launchLocales);
    // More than the EN/FR the admin chrome is clamped to (Blocs 118/120):
    // editorial content follows the public site, not the admin.
    expect(editorialLocales.length).toBeGreaterThan(2);
  });
});
