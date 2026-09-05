// M2 (bloc de correctifs C): baseline security headers applied to every
// response via next.config.ts. These are static and low-risk (they never
// depend on page content), so they live in the Next config rather than the
// per-request middleware. The Content-Security-Policy is handled separately
// in src/proxy.ts because it needs a per-request nonce.
//
// HSTS is intentionally NOT set here — it belongs on the TLS-terminating
// reverse proxy (openresty), see finding M5 — so it is added there, not by
// the app which also answers plain HTTP during local development.
export const securityHeaders: ReadonlyArray<{ key: string; value: string }> = [
  // Clickjacking: the admin must never be framable. frame-ancestors 'none'
  // in the CSP (proxy.ts) is the modern equivalent; this covers older UAs.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing a response into an unexpected type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which can carry context) to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No page here uses the camera/mic/geolocation/FLoC — deny them outright.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];
