import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  experimental: { authInterrupts: true },
};

export default createNextIntlPlugin()(nextConfig);
