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

// Detects the visitor's browser language on their very first request (no
// NEXT_LOCALE cookie yet) and applies it immediately — mutating the
// request's own cookie jar (not just the response's) so this exact render
// already picks it up in src/i18n/request.ts, instead of only taking
// effect from the next request onward. Also clamps the locale used to
// render /admin routes to EN/FR (Bloc 47/C review): the admin chrome
// shares the same NEXT_LOCALE cookie as the public site, so without this
// a visitor's ES/DE/TR public preference would otherwise leak into the
// admin UI even though AdminLocaleToggle only ever offers EN/FR. The
// clamp only affects *this* request's render — the real, unclamped
// preference persisted to the browser cookie is never touched by it, so
// public pages keep working normally regardless of what was last shown
// in admin.
// Named "proxy", not "middleware" — Next 16 renamed the file convention
// (src/middleware.ts is deprecated in favor of src/proxy.ts / a `proxy`
// export), and this app is already on 16.3.0.
export function proxy(request: NextRequest) {
  const cookieLocale = request.cookies.get(cookieName)?.value;
  const isFirstVisit = cookieLocale === undefined;
  const detected =
    cookieLocale ?? detectLocale(request.headers.get("accept-language"));

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const renderLocale =
    isAdminRoute && !adminLocales.includes(detected) ? "en" : detected;

  if (!isFirstVisit && renderLocale === cookieLocale)
    return NextResponse.next();

  request.cookies.set(cookieName, renderLocale);
  // A plain Headers instance (not `request` itself) — passing the
  // NextRequest object directly trips an internal `instanceof Headers`
  // check when the two don't resolve to the exact same Headers class.
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
