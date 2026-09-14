// Bloc 100: the visit-tracking script's URL, and the CSP origin that goes
// with it. Deliberately generic — nothing here knows which analytics tool is
// behind the URL, it is only a script to load.
//
// Prisma must stay out of this file: src/proxy.ts imports the origin helper
// below, and middleware runs on the Edge runtime where Prisma cannot follow.
// The database side lives in src/lib/site-settings.ts.

/** The protocols a script URL may use. Anything else is refused outright. */
const allowedProtocols = ["http:", "https:"];

/**
 * The tracking script URL to use, or null when none is configured.
 *
 * An empty (or blank) value means "no tracking", not an error: that is how an
 * admin turns it off. Anything that is not a parsable http(s) URL is refused,
 * so a typo cannot end up as a <script src> on every page of the site.
 */
export function parseTrackingScriptUrl(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!allowedProtocols.includes(url.protocol)) return null;
  // Credentials in a script URL would be sent to the tracker on every page
  // load and shown in the admin field; nothing legitimate needs them.
  if (url.username || url.password) return null;
  return value;
}

/**
 * The origin to add to the CSP's connect-src, read from TRACKING_ORIGIN.
 *
 * The nonce the layout puts on the tracking <script> is what lets it LOAD
 * under `script-src 'strict-dynamic'`. It says nothing about where that script
 * may then send its measurements: those are governed by connect-src, which is
 * 'self' alone. A tracker hosted on another domain therefore needs its origin
 * named there, and the CSP is built in middleware — Edge, no database — so the
 * origin comes from the environment rather than from the admin setting.
 * Leaving it unset is the same-origin case, which 'self' already covers.
 *
 * Only the origin is kept (scheme + host + port). Passing the value through
 * URL is also what stops a malformed or hostile value from injecting extra
 * directives into the policy.
 */
export function trackingConnectOrigin(
  value: string | undefined,
): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return allowedProtocols.includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}
