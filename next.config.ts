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
    return [{ source: "/:path*", headers: [...securityHeaders] }];
  },
};

export default createNextIntlPlugin()(nextConfig);
