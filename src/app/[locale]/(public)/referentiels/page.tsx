import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ReferenceCatalogGrid } from "@/components/reference-catalog-grid";
import { Breadcrumb } from "@/components/public-breadcrumb";
import { PageHeader } from "@/components/public-page-header";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { contactHref } from "@/lib/contact-link";
import { pageMetadata } from "@/lib/page-metadata";
import { referenceCatalog } from "@/lib/reference-catalog";
import { getPublicDescriptions } from "@/lib/tool-descriptions-server";

// Bloc 50/1b: dedicated index for the /referentiels root, now independent
// from /guides (the reference grid used to live embedded inside the
// /guides page — see guides-hub.tsx).
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("references"),
    getLocale(),
  ]);
  // Bloc 91/E2: the index had no description at all (it inherited the
  // homepage intro) — now its own.
  return pageMetadata({
    locale,
    path: "/referentiels",
    title: t("title"),
    description: t("index-intro"),
  });
}

export default async function ReferentielsPage() {
  // Bloc 60 review (Codex PR #81): forces per-request dynamic rendering —
  // without it, Next has no dynamic API call to detect on this page (only
  // a direct Prisma read via getCalculatorAvailability, invisible to its
  // static-vs-dynamic analysis) and statically caches the first render,
  // so a later admin toggle would never reach this page.
  await connection();
  const [t, navigation, active, locale] = await Promise.all([
    getTranslations("references"),
    getTranslations("Navigation"),
    getCalculatorAvailability(),
    getLocale(),
  ]);
  // Bloc 129 §3.3 : les descriptions viennent de la base (Bloc 130). Elles y
  // sont rangées par slug de calculateur — « gemmes », « consommables » — et
  // la grille les lit par slug public — « gems », « shop » : le catalogue
  // fait le pont, il est le seul à connaître les deux.
  const stored = await getPublicDescriptions(locale);
  const descriptions = Object.fromEntries(
    referenceCatalog.map((reference) => [
      reference.slug,
      stored[reference.calculatorSlug] ?? "",
    ]),
  );
  return (
    <main className="public-main">
      <Breadcrumb
        label={navigation("breadcrumb")}
        items={[
          { label: navigation("home"), href: "/" },
          { label: navigation("referentiels") },
        ]}
      />
      <PageHeader title={t("title")} description={t("index-intro")} />
      <ReferenceCatalogGrid
        t={t}
        locale={locale}
        active={active}
        descriptions={descriptions}
        suggestion={{
          // §3.3 : la 8e case ouvre Contact sur « Idée d'amélioration ».
          href: contactHref("improvement-suggestion"),
          title: t("missing-title"),
          text: t("missing-text"),
          cta: t("missing-cta"),
        }}
      />
    </main>
  );
}
