import { defineRouting } from "next-intl/routing";
import { launchLocales, defaultLaunchLocale } from "@/lib/translations";

// Bloc 91/E1: locale-prefixed routing. The public site now lives under
// /[locale]/… with symmetric URLs (/fr/tools, /en/tools, …) so every language
// has its own crawlable URL — replacing the previous single-URL,
// cookie/Accept-Language scheme. `localePrefix: "always"` keeps the default
// locale visible too (/fr/…), so all 5 languages are treated identically by
// search engines. Admin and API routes stay OUTSIDE this prefix (handled in
// src/proxy.ts).
export const routing = defineRouting({
  locales: launchLocales,
  defaultLocale: defaultLaunchLocale,
  localePrefix: "always",
});
