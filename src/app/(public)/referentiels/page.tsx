import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReferenceCatalogGrid } from "@/components/reference-catalog-grid";
import { languageAlternates } from "@/lib/site-url";

// Bloc 50/1b: dedicated index for the /referentiels root, now independent
// from /guides (the reference grid used to live embedded inside the
// /guides page — see guides-hub.tsx). The reference-switcher banner and
// any calculator-availability filtering are layered on top of this route
// by a later change, not part of this page.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("references");
  return {
    title: t("title"),
    alternates: { languages: languageAlternates("/referentiels") },
  };
}

export default async function ReferentielsPage() {
  const [t, tHome] = await Promise.all([
    getTranslations("references"),
    getTranslations("Home"),
  ]);
  return (
    <main className="public-main">
      {/* Bloc 53/D: same title + intro sentence as the homepage's
          référentiels section, so /referentiels reads as the same entry
          point reached a different way (Bloc 38/K's treatment for /tools). */}
      <h1 className="referentiels-page-title">{tHome("referentielsTitle")}</h1>
      <p>{tHome("referentielsDescription")}</p>
      <ReferenceCatalogGrid t={t} />
    </main>
  );
}
