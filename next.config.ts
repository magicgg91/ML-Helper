import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  experimental: { authInterrupts: true },
  // M2/F5: stop advertising the framework in every response.
  poweredByHeader: false,
  // M2: baseline security headers on every route (the per-request CSP is
  // added in src/proxy.ts, which needs a nonce).
  async headers() {
    // Bloc 91/M3: the game images in public/ are named by convention and
    // rarely replaced, yet were served with the default Cache-Control:
    // max-age=0 (revalidated on every visit, across hundreds of files). Give
    // them a one-year immutable cache — a replacement changes the file name or
    // accepts the cache — while the security headers above still apply.
    const immutable = {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    };
    const imageDirs = [
      "tools",
      "referentials",
      "gems",
      "equipment",
      "templars",
      "consumables",
    ];
    return [
      { source: "/:path*", headers: [...securityHeaders] },
      ...imageDirs.map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [immutable],
      })),
    ];
  },
  // Bloc 91/M6: 308-redirect URLs that used to exist (renamed reference slugs
  // and the pre-Bloc-50 /guides/referentiels/… nesting) to their current home,
  // so shared/old links land on content instead of a 404. The middleware adds
  // the locale prefix first, so these match the already-prefixed form and keep
  // the visitor's locale (:locale is carried into the destination).
  async redirects() {
    const withLocale = "/:locale(fr|en|de|es|tr)";
    return [
      {
        source: `${withLocale}/referentiels/gemmes`,
        destination: "/:locale/referentiels/gems",
        permanent: true,
      },
      {
        source: `${withLocale}/referentiels/templiers`,
        destination: "/:locale/referentiels/templars",
        permanent: true,
      },
      {
        source: `${withLocale}/referentiels/consommables`,
        destination: "/:locale/referentiels/shop",
        permanent: true,
      },
      {
        source: `${withLocale}/guides/referentiels/:slug`,
        destination: "/:locale/referentiels/:slug",
        permanent: true,
      },
      // Codex review: this legacy URL previously only 307-redirected from the
      // tool page — make it a permanent 308 here, consistent with the others.
      {
        source: `${withLocale}/tools/referentiels`,
        destination: "/:locale/referentiels",
        permanent: true,
      },
    ];
  },
};

export default createNextIntlPlugin()(nextConfig);
