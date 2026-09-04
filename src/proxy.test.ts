import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { detectLocale, matchAcceptLanguage, proxy } from "./proxy";

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

// The forwarded render locale next-intl reads (X-NEXT-INTL-LOCALE) surfaces on
// a NextResponse.next({request:{headers}}) as this override header.
const forwardedLocale = (r: Response) =>
  r.headers.get("x-middleware-request-x-next-intl-locale");

describe("Bloc 47/B: Accept-Language matching", () => {
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
    for (const locale of ["en", "fr", "de", "es", "tr"])
      expect(detectLocale(locale)).toBe(locale);
  });
  it("matchAcceptLanguage returns null (not the default) when nothing matches", () => {
    expect(matchAcceptLanguage("pt-BR,pt;q=0.9")).toBeNull();
    expect(matchAcceptLanguage(null)).toBeNull();
    expect(matchAcceptLanguage("de")).toBe("de");
  });
});

// Bloc 91/E1: the public site is locale-prefixed. An unprefixed URL is
// redirected to a negotiated /[locale]/ URL; an already-prefixed one renders
// and forwards its locale to next-intl.
describe("Bloc 91/E1: locale-prefixed routing", () => {
  it("redirects an unprefixed public path to the negotiated locale (302 + cookie)", () => {
    const res = proxy(
      makeRequest({ acceptLanguage: "de-DE,de;q=0.9", path: "/tools" }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/de/tools");
    expect(res.cookies.get("NEXT_LOCALE")?.value).toBe("de");
  });

  it("permanently (308) redirects to the default locale with no signal (Googlebot / old FR URLs)", () => {
    const res = proxy(makeRequest({ path: "/tools" }));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://example.com/fr/tools");
  });

  it("redirects the bare root to /{locale}", () => {
    expect(proxy(makeRequest({ path: "/" })).headers.get("location")).toBe(
      "https://example.com/fr",
    );
  });

  it("honours the NEXT_LOCALE cookie preference over Accept-Language", () => {
    const res = proxy(
      makeRequest({
        cookie: "NEXT_LOCALE=es",
        acceptLanguage: "de",
        path: "/",
      }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/es");
  });

  it("does not redirect an already-prefixed URL, and forwards its locale", () => {
    const res = proxy(makeRequest({ path: "/en/tools" }));
    expect(res.headers.get("location")).toBeNull();
    expect(forwardedLocale(res)).toBe("en");
  });
});

describe("M2/F2: middleware security", () => {
  it("sets a nonce-based Content-Security-Policy on a rendered (prefixed) page response", () => {
    const res = proxy(makeRequest({ path: "/fr/guides" }));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/script-src [^;]*'nonce-[^']+'/);
    // the nonce is also forwarded on the request for the root layout's script
    expect(res.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
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

// Bloc 47/C + Bloc 91/E1: admin routes are NOT locale-prefixed — the chrome
// only offers EN/FR, so the render locale is clamped there and no redirect
// happens.
describe("Bloc 47/C review: admin locale clamp", () => {
  it("clamps an unsupported cookie locale to en for /admin, without redirecting or touching the public cookie", () => {
    const res = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=es", path: "/admin" }),
    );
    expect(res.headers.get("location")).toBeNull();
    expect(forwardedLocale(res)).toBe("en");
    expect(res.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("keeps an already-admin-safe cookie locale (fr) for /admin", () => {
    const res = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=fr", path: "/admin" }),
    );
    expect(forwardedLocale(res)).toBe("fr");
    expect(res.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("clamps a first-visit /admin request (es browser → en) without a redirect", () => {
    const res = proxy(
      makeRequest({ acceptLanguage: "es-ES,es;q=0.9", path: "/admin" }),
    );
    expect(res.headers.get("location")).toBeNull();
    expect(forwardedLocale(res)).toBe("en");
  });

  it("also covers /login (non-prefixed auth route)", () => {
    const res = proxy(
      makeRequest({ cookie: "NEXT_LOCALE=de", path: "/login" }),
    );
    expect(res.headers.get("location")).toBeNull();
    expect(forwardedLocale(res)).toBe("en");
  });
});
