import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { fallbackLocale } from "@/i18n/config";
import { buildWebManifest } from "@/lib/web-manifest";

// Bloc 95 (audit SEO Bloc 91/F1): the web app manifest, so players can install
// ML-Helper on a phone's home screen and open it without browser chrome.
//
// Codex review (PR #120): the installed app's name is text a user reads, so it
// goes through next-intl like every other visible string (AGENTS.md) — it
// reuses Public.meta.siteTitle, the site's own name, already translated in the
// 5 locales. A single file-convention manifest is one static document and
// cannot vary per visitor, so this one carries the English wording (the site's
// documented fallback) and covers the routes that are not locale-prefixed
// (/admin, /login). Every public page links to its own language's manifest
// instead — src/app/[locale]/manifest.webmanifest/route.ts, wired up by the
// locale layout's generateMetadata.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({
    locale: fallbackLocale,
    namespace: "Public.meta",
  });
  return buildWebManifest(t("siteTitle"));
}
