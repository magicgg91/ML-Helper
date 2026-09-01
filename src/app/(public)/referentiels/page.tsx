import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { ReferenceCatalogGrid } from "@/components/reference-catalog-grid";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { languageAlternates } from "@/lib/site-url";

// Bloc 50/1b: dedicated index for the /referentiels root, now independent
// from /guides (the reference grid used to live embedded inside the
// /guides page — see guides-hub.tsx).
// Bloc 60 review (Codex PR #81): fetches calculator availability itself now
// (previously deferred to "a later change" — never landed until an
// inactive-by-default reference, Events, actually exposed the gap) so
// ReferenceCatalogGrid can hide inactive references from this index too.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("references");
  return {
    title: t("title"),
    alternates: { languages: languageAlternates("/referentiels") },
  };
}

export default async function ReferentielsPage() {
  // Bloc 60 review (Codex PR #81): forces per-request dynamic rendering —
  // without it, Next has no dynamic API call to detect on this page (only
  // a direct Prisma read via getCalculatorAvailability, invisible to its
  // static-vs-dynamic analysis) and statically caches the first render,
  // so a later admin toggle would never reach this page (same pattern
  // already used by /guides and the homepage, both DB-backed too).
  await connection();
  const [t, tHome, active] = await Promise.all([
    getTranslations("references"),
    getTranslations("Home"),
    getCalculatorAvailability(),
  ]);
  return (
    <main className="public-main">
      {/* Bloc 53/D: same title + intro sentence as the homepage's
          référentiels section, so /referentiels reads as the same entry
          point reached a different way (Bloc 38/K's treatment for /tools). */}
      <h1 className="referentiels-page-title">{tHome("referentielsTitle")}</h1>
      <p>{tHome("referentielsDescription")}</p>
      <ReferenceCatalogGrid t={t} active={active} />
    </main>
  );
}
