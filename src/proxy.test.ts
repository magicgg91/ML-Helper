import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { detectLocale, proxy } from "./proxy";

function makeRequest(opts: {
  acceptLanguage?: string;
  cookie?: string;
  path?: string;
}) {
  const headers = new Headers();
  if (opts.acceptLanguage) headers.set("accept-language", opts.acceptLanguage);
  if (opts.cookie) headers.set("cookie", opts.cookie);
  return new NextRequest(`https://example.com${opts.path ?? "/"}`, {
    headers,
  });
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

describe("M2/F2: middleware security", () => {
  it("sets a nonce-based Content-Security-Policy on page responses", () => {
    const response = proxy(makeRequest({ path: "/guides" }));
    const csp = response.headers.get("content-security-policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/script-src [^;]*'nonce-[^']+'/);
  });

  it("blocks a cross-site mutating API request (F2)", () => {
    const headers = new Headers();
    headers.set("sec-fetch-site", "cross-site");
    const request = new NextRequest("https://example.com/api/admin/users", {
      method: "POST",
      headers,
    });
    expect(proxy(request).status).toBe(403);
  });

  it("allows a same-origin mutating API request (F2)", () => {
    const headers = new Headers();
    headers.set("sec-fetch-site", "same-origin");
    const request = new NextRequest("https://example.com/api/admin/users", {
      method: "POST",
      headers,
    });
    expect(proxy(request).status).not.toBe(403);
  });

  it("allows a non-browser API request with no Origin/Sec-Fetch-Site (F2)", () => {
    const request = new NextRequest("https://example.com/api/contact", {
      method: "POST",
    });
    expect(proxy(request).status).not.toBe(403);
  });
});

// Bloc 47/C review: AdminLocaleToggle only ever offers EN/FR, but without
// this clamp the admin chrome would still render in whatever the shared
// NEXT_LOCALE cookie holds (e.g. ES/DE/TR picked while browsing publicly),
// leaving the toggle with neither button pressed.
describe("Bloc 47/C review: admin locale clamp", () => {
  it("clamps an unsupported cookie locale to en for /admin, without touching the public cookie", () => {
    const response = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=es", path: "/admin" }),
    );
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "NEXT_LOCALE=en",
    );
    // The real (es) preference is never overwritten for future public visits.
    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  // M2: the middleware now always forwards a per-request CSP + nonce, so it
  // always builds a NextResponse.next({ request }) — the assertion shifts
  // from "no request-cookie override at all" to "the render locale is not
  // clamped to something else".
  it("leaves an already-admin-safe cookie locale untouched for /admin", () => {
    const response = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=fr", path: "/admin" }),
    );
    const cookie = response.headers.get("x-middleware-request-cookie");
    expect(cookie === null || cookie.includes("NEXT_LOCALE=fr")).toBe(true);
    expect(cookie ?? "").not.toContain("NEXT_LOCALE=en");
    expect(response.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("does not clamp public routes even when the cookie holds an admin-unsupported locale", () => {
    const response = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=es", path: "/guides" }),
    );
    const cookie = response.headers.get("x-middleware-request-cookie");
    expect(cookie === null || cookie.includes("NEXT_LOCALE=es")).toBe(true);
    expect(cookie ?? "").not.toContain("NEXT_LOCALE=en");
  });

  it("clamps a first-visit /admin request too, while still persisting the real detected locale for public use", () => {
    const response = proxy(
      makeRequest({ acceptLanguage: "es-ES,es;q=0.9", path: "/admin" }),
    );
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "NEXT_LOCALE=en",
    );
    expect(response.cookies.get("NEXT_LOCALE")?.value).toBe("es");
  });
});
