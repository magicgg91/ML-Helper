import { afterEach, describe, expect, it, vi } from "vitest";
import { launchLocales } from "./translations";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// Bloc 42/J: NEXTAUTH_URL is already the app's "public origin" env var
// (.env.example) — reused for the sitemap/hreflang base URL instead of a
// second one. ml-helper.com (cdc-confirmed domain) is only the fallback
// for environments that don't set it.
describe("site-url", () => {
  it("uses NEXTAUTH_URL, trimmed of a trailing slash, when set", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com/");
    const { siteUrl, absoluteUrl } = await import("./site-url");
    expect(siteUrl).toBe("https://ml-helper.com");
    expect(absoluteUrl("/tools")).toBe("https://ml-helper.com/tools");
  });

  it("falls back to the confirmed production domain when NEXTAUTH_URL is unset", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const { siteUrl } = await import("./site-url");
    expect(siteUrl).toBe("https://ml-helper.com");
  });

  it("builds a distinct locale-prefixed alternate for every launched locale plus an x-default pointing at the French URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");
    const { languageAlternates } = await import("./site-url");
    const alternates = languageAlternates("/guides");
    for (const locale of launchLocales)
      expect(alternates[locale]).toBe(`https://ml-helper.com/${locale}/guides`);
    expect(alternates["x-default"]).toBe("https://ml-helper.com/fr/guides");
    expect(Object.keys(alternates)).toHaveLength(launchLocales.length + 1);
  });

  it("collapses the home path to /{locale} (no trailing slash) in the alternates", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");
    const { languageAlternates } = await import("./site-url");
    const alternates = languageAlternates("/");
    for (const locale of launchLocales)
      expect(alternates[locale]).toBe(`https://ml-helper.com/${locale}`);
    expect(alternates["x-default"]).toBe("https://ml-helper.com/fr");
  });

  it("localizedPath / canonicalUrl prefix the locale, collapsing home to /{locale}", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");
    const { localizedPath, canonicalUrl } = await import("./site-url");
    expect(localizedPath("en", "/guides")).toBe("/en/guides");
    expect(localizedPath("fr", "/")).toBe("/fr");
    expect(canonicalUrl("de", "/tools")).toBe("https://ml-helper.com/de/tools");
    expect(canonicalUrl("fr", "/")).toBe("https://ml-helper.com/fr");
  });
});
