import { NextResponse, type NextRequest } from "next/server";
import { launchLocales } from "./lib/translations";
import { routing } from "./i18n/routing";

const cookieName = "NEXT_LOCALE";
// next-intl reads the render locale from this request header (see
// getRequestConfig's `requestLocale`); the middleware sets it so the root
// layout's getLocale()/getMessages() resolve correctly for every route —
// the URL locale for the public site, the clamped locale for admin.
const localeHeader = "X-NEXT-INTL-LOCALE";
const locales = routing.locales as readonly string[];
const defaultLocale = routing.defaultLocale;
// Bloc 47/C review: the admin chrome only offers EN/FR, and admin routes are
// deliberately NOT locale-prefixed (Bloc 91/E1) — a visitor who picked
// ES/DE/TR publicly still sees the admin UI in EN.
const adminLocales = ["en", "fr"];
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Bloc 47/B: picks the best-matching supported locale out of an
// Accept-Language header (e.g. "de-DE,de;q=0.9,en;q=0.8"), or null when
// nothing in the header is one of the supported locales (or it's absent).
export function matchAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const preferred = header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      return {
        tag: tag?.trim().split("-")[0]?.toLowerCase() ?? "",
        q: qPart ? Number(qPart) : 1,
      };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);
  return (
    preferred.find((entry) =>
      (launchLocales as readonly string[]).includes(entry.tag),
    )?.tag ?? null
  );
}

// Kept for backward compatibility with existing callers/tests: the matched
// locale, or the default when nothing matches.
export function detectLocale(header: string | null): string {
  return matchAcceptLanguage(header) ?? defaultLocale;
}

// M2 (bloc de correctifs C): a fresh per-request nonce authorizes exactly
// the inline scripts this app emits — the pre-paint theme script in the
// root layout and Next's own framework/flight scripts (Next reads the
// nonce from the request-side CSP header below and stamps it on those).
// btoa/getRandomValues are the Edge-runtime-safe primitives (no Buffer).
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Next's dev overlay / React refresh need eval; never in production.
    dev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const connectSrc = ["'self'", dev ? "ws:" : ""].filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Admin cover images accept external https URLs (F1 restricts them to
    // http/https); data: covers the TOTP QR code and inlined icons.
    "img-src 'self' data: https:",
    // The display fonts (Cinzel / IBM Plex Sans / JetBrains Mono) are pulled
    // from Google Fonts by globals.css's @import — allow the stylesheet host
    // (style-src) and the font-file host (font-src). data: keeps inlined
    // icon fonts working.
    "font-src 'self' data: https://fonts.gstatic.com",
    // React/Tailwind inject inline styles; styles are a far lower XSS risk
    // than scripts, which stay nonce-gated above. fonts.googleapis.com serves
    // the @import font stylesheet.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc}`,
  ].join("; ");
}

// F2 (bloc de correctifs F): defense-in-depth CSRF guard for state-changing
// API calls, on top of the SameSite=Lax session cookie. It keys off the
// browser's Sec-Fetch-Site metadata header — origin-independent, so it can't
// be tripped by the reverse proxy rewriting Host — and rejects only a
// request the browser itself labels cross-site.
function isCrossOriginMutation(request: NextRequest): boolean {
  if (!mutationMethods.has(request.method)) return false;
  return request.headers.get("sec-fetch-site") === "cross-site";
}

// Builds a NextResponse.next() that forwards the CSP nonce and the resolved
// locale on the request headers (so the root layout and next-intl see them),
// and echoes the CSP on the response.
function renderWithLocale(request: NextRequest, locale: string) {
  const nonce = makeNonce();
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the nonce from this request-side CSP header and applies it to
  // its own inline scripts.
  requestHeaders.set("content-security-policy", csp);
  requestHeaders.set(localeHeader, locale);
  // Bloc 90/E1: the layout can't otherwise see the pathname — forward it so a
  // disabled-locale /[locale]/ URL can redirect to its English equivalent.
  // The query string travels in its own header (Codex P2) so that redirect
  // preserves deep-link state (e.g. ?open=templars selecting a calculator).
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-search", request.nextUrl.search);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes: no locale/CSP handling (they return JSON), just the F2
  // same-origin guard for mutations.
  if (pathname.startsWith("/api")) {
    if (isCrossOriginMutation(request))
      return new NextResponse("forbidden", { status: 403 });
    return NextResponse.next();
  }

  // Metadata / asset routes (sitemap.xml, robots.txt, *.png/.ico/.webmanifest,
  // opengraph-image, …): never locale-prefixed, and they render their own
  // non-HTML content, so no locale header or CSP is needed.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Admin and login: deliberately NOT locale-prefixed (Bloc 91/E1). Keep the
  // Bloc 90 admin clamp (EN/FR only) and the CSP/nonce.
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    const cookieLocale = request.cookies.get(cookieName)?.value;
    const detected =
      cookieLocale ??
      matchAcceptLanguage(request.headers.get("accept-language"));
    const adminLocale =
      detected && adminLocales.includes(detected) ? detected : "en";
    return renderWithLocale(request, adminLocale);
  }

  // Public routes: everything below /[locale]/…
  const firstSegment = pathname.split("/")[1] ?? "";
  const hasLocalePrefix = locales.includes(firstSegment);

  if (!hasLocalePrefix) {
    // Bloc 91/E1: no locale in the URL yet — negotiate one and redirect to the
    // prefixed URL, remembering the choice in the cookie for next time. The
    // redirect is permanent (308) only when we fall back to the default locale
    // with no signal at all (Googlebot, or an old indexed FR URL — point E1/4);
    // a per-visitor negotiation from cookie/Accept-Language is a temporary 302.
    const cookieLocale = request.cookies.get(cookieName)?.value;
    const cookieOk = Boolean(cookieLocale && locales.includes(cookieLocale));
    const matched = cookieOk
      ? (cookieLocale as string)
      : matchAcceptLanguage(request.headers.get("accept-language"));
    const target = matched ?? defaultLocale;
    const permanent = !cookieOk && !matched;

    const url = request.nextUrl.clone();
    url.pathname = `/${target}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url, permanent ? 308 : 302);
    response.cookies.set(cookieName, target, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // Already prefixed: render in the URL locale and keep the cookie preference
  // in sync with it (so a later unprefixed visit lands on the same language).
  const response = renderWithLocale(request, firstSegment);
  if (request.cookies.get(cookieName)?.value !== firstSegment)
    response.cookies.set(cookieName, firstSegment, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
