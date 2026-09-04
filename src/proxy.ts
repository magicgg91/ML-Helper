import { NextResponse, type NextRequest } from "next/server";
import { launchLocales } from "./lib/translations";

// Mirrors src/i18n/config.ts's defaultLocale — duplicated as a plain
// literal instead of imported, since that module touches node:fs
// (readFile/readdir), which isn't available in the Edge middleware
// runtime this file runs under.
const defaultLocale = "fr";
const cookieName = "NEXT_LOCALE";
// Bloc 47/C review: AdminLocaleToggle only offers EN/FR, but the admin
// chrome shares the same NEXT_LOCALE cookie as the public site — without
// clamping here, a visitor who picked ES/DE/TR publicly would still see
// the admin UI render in that language (with neither of the toggle's own
// 2 buttons showing as selected) the moment they opened /admin.
const adminLocales = ["en", "fr"];
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Bloc 47/B: picks the best-matching supported locale out of an
// Accept-Language header (e.g. "de-DE,de;q=0.9,en;q=0.8"), falling back
// to defaultLocale when nothing in the header is one of the 5 supported
// locales (or the header is absent entirely).
export function detectLocale(header: string | null): string {
  if (!header) return defaultLocale;
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
  const match = preferred.find((entry) =>
    (launchLocales as readonly string[]).includes(entry.tag),
  );
  return match?.tag ?? defaultLocale;
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
    "font-src 'self' data:",
    // React/Tailwind inject inline styles; styles are a far lower XSS risk
    // than scripts, which stay nonce-gated above.
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc}`,
  ].join("; ");
}

// F2 (bloc de correctifs F): defense-in-depth CSRF guard for state-changing
// API calls, on top of the SameSite=Lax session cookie. It keys off the
// browser's Sec-Fetch-Site metadata header — origin-independent, so it can't
// be tripped by the reverse proxy rewriting Host — and rejects only a
// request the browser itself labels cross-site. Anything else (same-origin,
// same-site, a user-initiated "none", or a non-browser client that sends no
// Sec-Fetch-Site at all — curl, health probes) is allowed; those don't carry
// the ambient session cookie a CSRF attack would rely on.
function isCrossOriginMutation(request: NextRequest): boolean {
  if (!mutationMethods.has(request.method)) return false;
  return request.headers.get("sec-fetch-site") === "cross-site";
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

  const cookieLocale = request.cookies.get(cookieName)?.value;
  const isFirstVisit = cookieLocale === undefined;
  const detected =
    cookieLocale ?? detectLocale(request.headers.get("accept-language"));
  const isAdminRoute = pathname.startsWith("/admin");
  const renderLocale =
    isAdminRoute && !adminLocales.includes(detected) ? "en" : detected;

  const nonce = makeNonce();
  const csp = contentSecurityPolicy(nonce);

  // Only mutate the request's own cookie jar when the render locale actually
  // differs from the cookie (first visit, or the admin clamp) — this is what
  // makes THIS render pick it up (Bloc 47/B), and keeping it conditional
  // preserves the "no change, no override" behavior the tests pin down.
  if (renderLocale !== cookieLocale) request.cookies.set(cookieName, renderLocale);

  // A plain Headers instance (not `request` itself) — passing the
  // NextRequest object directly trips an internal `instanceof Headers`
  // check when the two don't resolve to the exact same Headers class.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the nonce from this request-side CSP header and applies it to
  // its own inline scripts.
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  if (isFirstVisit) {
    // Persists the real detected locale (unclamped) so future public
    // visits still get the visitor's actual browser language — only the
    // in-flight admin render above was clamped.
    response.cookies.set(cookieName, detected, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
