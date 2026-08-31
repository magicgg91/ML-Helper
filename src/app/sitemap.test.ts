import { describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    guide: {
      findMany: async () => [
        { slug: "premier-guide", updatedAt: new Date("2026-01-01") },
        { slug: "second-guide", updatedAt: new Date("2026-02-01") },
      ],
    },
  },
}));
vi.mock("@/lib/calculators-server", () => ({
  getCalculatorAvailability: async () => ({
    "combat-equipment": true,
    "expedition-equipment": false,
    "level-up": true,
    templiers: true,
    gemmes: true,
    consommables: true,
  }),
}));

describe("sitemap (Bloc 42/J)", () => {
  it("lists every static public page once, at its real absolute URL", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    for (const path of ["/", "/tools", "/guides", "/contact", "/legal"])
      expect(urls).toContain(`https://ml-helper.com${path}`);
    // Never /admin, /login, or the /tools/referentiels redirect stub.
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(urls.some((url) => url.includes("/login"))).toBe(false);
    expect(urls.some((url) => url.includes("/tools/referentiels"))).toBe(false);
  });

  it("lists the 4 tool category pages — /tools/[slug] only ever resolves these, never a per-calculator slug", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    for (const category of ["villes", "combat", "classement", "competences"])
      expect(urls).toContain(`https://ml-helper.com/tools/${category}`);
  });

  it("lists every published guide, using its own lastModified", async () => {
    const entries = await sitemap();
    const guideEntry = entries.find(
      (entry) => entry.url === "https://ml-helper.com/guides/premier-guide",
    );
    expect(guideEntry).toBeDefined();
    expect(guideEntry?.lastModified).toEqual(new Date("2026-01-01"));
  });

  it("lists only active référentiels, skipping a deactivated one", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain(
      "https://ml-helper.com/guides/referentiels/combat-equipment",
    );
    // expedition-equipment is inactive in this test's mocked availability.
    expect(urls).not.toContain(
      "https://ml-helper.com/guides/referentiels/expedition-equipment",
    );
    // Bloc 48/F: renamed Consommables -> Boutique, URL /consommables ->
    // /shop (calculatorSlug "consommables" stays the internal DB key above).
    expect(urls).toContain("https://ml-helper.com/guides/referentiels/shop");
  });

  it("gives every entry hreflang alternates for the 5 launched locales plus x-default, self-referencing the same URL", async () => {
    const entries = await sitemap();
    const home = entries.find(
      (entry) => entry.url === "https://ml-helper.com/",
    );
    expect(home?.alternates?.languages?.fr).toBe("https://ml-helper.com/");
    expect(home?.alternates?.languages?.["x-default"]).toBe(
      "https://ml-helper.com/",
    );
  });
});
