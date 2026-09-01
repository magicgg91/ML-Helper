import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReferenceCatalogGrid } from "@/components/reference-catalog-grid";
import { languageAlternates } from "@/lib/site-url";

// Bloc 50/1b: dedicated index for the /referentiels root, now independent
// from /guides (the reference grid used to live embedded inside the
// /guides page — see guides-hub.tsx). Kept minimal on purpose: eyebrow +
// title + the shared grid, same shape as /guides's own index page. The
// reference-switcher banner and any calculator-availability filtering are
// layered on top of this route by a later change, not part of this page.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("references");
  return {
    title: t("title"),
    alternates: { languages: languageAlternates("/referentiels") },
  };
}

export default async function ReferentielsPage() {
  const t = await getTranslations("references");
  return (
    <main className="public-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <ReferenceCatalogGrid t={t} />
    </main>
  );
}
