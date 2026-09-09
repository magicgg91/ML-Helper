import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildWebManifest } from "@/lib/web-manifest";

// Bloc 95, Codex review (PR #120): the manifest of the language the visitor is
// actually reading. The `app/manifest` file convention only exists at the app
// root and produces a single static document, so a translated name needs a
// route of its own under /[locale]/ — /fr/manifest.webmanifest,
// /en/manifest.webmanifest, … Each locale's public pages point at theirs (see
// generateMetadata in src/app/[locale]/layout.tsx), so the name Android and
// Chrome show in the install prompt is in the visitor's language rather than
// the one frozen into a shared file.
//
// Everything except the name is identical across locales and comes from
// buildWebManifest, so the two entry points can't drift apart.

// Prerenders the 5 manifests at build time, like the locale layout does for
// the pages themselves.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/[locale]/manifest.webmanifest">,
) {
  const { locale } = await params;
  // Unknown segment (not one of the 5 launched locales) → 404, same as the
  // locale layout: a manifest for a language that doesn't exist would name the
  // app in whatever the fallback happened to be.
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Public.meta" });
  return NextResponse.json(buildWebManifest(t("siteTitle")), {
    // The manifest's own media type; browsers accept application/json too, but
    // this is what the spec asks for and what the root file convention emits.
    headers: { "content-type": "application/manifest+json" },
  });
}
