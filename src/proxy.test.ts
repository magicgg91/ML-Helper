import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { detectLocale, proxy } from "./proxy";

function makeRequest(opts: { acceptLanguage?: string; cookie?: string }) {
  const headers = new Headers();
  if (opts.acceptLanguage) headers.set("accept-language", opts.acceptLanguage);
  if (opts.cookie) headers.set("cookie", opts.cookie);
  return new NextRequest("https://example.com/", { headers });
}

describe("Bloc 47/B: detectLocale", () => {
  it("picks the primary language subtag of the highest-priority supported entry", () => {
    expect(detectLocale("de-DE,de;q=0.9,en;q=0.5")).toBe("de");
  });

  it("skips unsupported languages and picks the next supported one by priority", () => {
    expect(detectLocale("pt;q=0.9,es;q=0.8,fr;q=0.5")).toBe("es");
  });

  it("falls back to fr (defaultLocale) when nothing in the header is supported", () => {
    expect(detectLocale("pt-BR,pt;q=0.9")).toBe("fr");
  });

  it("falls back to fr when there is no Accept-Language header at all", () => {
    expect(detectLocale(null)).toBe("fr");
  });

  it("supports all 5 launched locales", () => {
    expect(detectLocale("en")).toBe("en");
    expect(detectLocale("fr")).toBe("fr");
    expect(detectLocale("de")).toBe("de");
    expect(detectLocale("es")).toBe("es");
    expect(detectLocale("tr")).toBe("tr");
  });
});

describe("Bloc 47/B: proxy", () => {
  it("sets NEXT_LOCALE from the browser language on a first visit (no cookie yet)", () => {
    const response = proxy(makeRequest({ acceptLanguage: "de-DE,de;q=0.9" }));
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("de");
  });

  it("does nothing when NEXT_LOCALE is already set", () => {
    const response = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=es", acceptLanguage: "de" }),
    );
    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("makes the detected locale available to the very same request, not just future ones", () => {
    const response = proxy(makeRequest({ acceptLanguage: "es-ES,es;q=0.9" }));
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "NEXT_LOCALE=es",
    );
  });
});
