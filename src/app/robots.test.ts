import { describe, expect, it, vi } from "vitest";
import robots from "./robots";

vi.stubEnv("NEXTAUTH_URL", "https://ml-helper.com");
vi.mock("next/server", () => ({ connection: async () => undefined }));

describe("robots (Bloc 91/E4)", () => {
  it("allows crawling, blocks admin/api/login, and declares the sitemap", async () => {
    const result = await robots();
    const rules = result.rules as {
      userAgent: string;
      allow: string;
      disallow: string[];
    };
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    // /admin, /api and /login are the only non-public trees; the locale-
    // prefixed public site (/fr…, /en…) stays fully crawlable.
    expect(rules.disallow).toEqual(["/admin", "/api/", "/login"]);
    expect(result.sitemap).toBe("https://ml-helper.com/sitemap.xml");
  });
});
