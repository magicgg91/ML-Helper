import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../../services/setup-superadmin";
import { getLocale, getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import { ReferenceCatalogGrid } from "@/components/reference-catalog-grid";
import { localizedText } from "@/lib/translations";
import { prisma } from "@/lib/prisma";
import { canonicalUrl, languageAlternates } from "@/lib/site-url";
import { defaultOgImagePath, ogLocale } from "@/lib/page-metadata";
import { JsonLd } from "@/components/json-ld";
import { websiteJsonLd } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const [t, meta, locale] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Public.meta"),
    getLocale(),
  ]);
  const url = canonicalUrl(locale, "/");
  const description = t("intro");
  // Bloc 91/E2: no `title` here on purpose — the homepage inherits the root
  // layout's title.default (the brand name) rather than a page title run
  // through the "%s | …" template, which would double-brand it. og:title is
  // the same brand name (Bloc 91/E3).
  return {
    description,
    alternates: { canonical: url, languages: languageAlternates("/") },
    openGraph: {
      type: "website",
      siteName: "ML-Helper",
      title: meta("siteTitle"),
      description,
      url,
      locale: ogLocale(locale),
      images: [defaultOgImagePath],
    },
    twitter: {
      card: "summary_large_image",
      title: meta("siteTitle"),
      description,
    },
  };
}

export default async function HomePage() {
  await connection();
  if (!(await hasSuperAdmin())) redirect("/admin/setup");
  const [t, tools, guidesT, references, active, locale, recentGuides] =
    await Promise.all([
      getTranslations("Home"),
      getTranslations("tools"),
      getTranslations("guides"),
      getTranslations("references"),
      getCalculatorAvailability(),
      getLocale(),
      prisma.guide.findMany({
        where: { status: "published", active: true },
        orderBy: { publishedAt: "desc" },
        take: 6,
      }),
    ]);
  return (
    <main className="public-main">
      {/* Bloc 91/M4: WebSite + Organization structured data for the home page. */}
      <JsonLd data={websiteJsonLd(locale)} />
      {/* Bloc 34/D: a short intro sentence replaces the carousel/hero — the
          tool category grid below is the actual point of the homepage and
          should stay visible without scrolling. Bloc 91/E5: the page now
          opens on a real <h1> carrying the "outils et guides Million Lords"
          positioning (the homepage previously had no h1 at all); it is styled
          to read as the intro's lead line, the descriptive sentence stays a
          <p> beneath it. */}
      <section className="home-intro">
        <h1>{t("h1")}</h1>
        <p>{t("intro")}</p>
      </section>
      <section className="home-tools">
        <p className="eyebrow">{t("toolsEyebrow")}</p>
        <h2>{t("toolsTitle")}</h2>
        <p>{t("toolsDescription")}</p>
        <ToolCategoryGrid active={active} locale={locale} t={tools} />
      </section>
      {/* Bloc 50 Group3: the guides/référentiels section used to be one
          combined block — now 3 independently-ordered sections (Outils,
          Référentiels, Guides), each keeping the same 1-click,
          no-detour-via-/guides or /referentiels principle. */}
      <section className="home-references">
        <p className="eyebrow">{t("referentielsEyebrow")}</p>
        <h2>{t("referentielsTitle")}</h2>
        <p>{t("referentielsDescription")}</p>
        {/* Structural cap (not a today-only coincidence): limit={8} keeps
            this teaser within .tool-category-grid's 4-column/2-row shape
            even once the catalog grows past 8 entries. */}
        <ReferenceCatalogGrid
          t={references}
          limit={8}
          locale={locale}
          active={active}
        />
      </section>
      {/* Bloc 34/E (Bloc 50 Group3: now its own section, take raised from 3
          to 6): the most recently published guides, same sort as /guides. */}
      <section className="home-guides">
        <p className="eyebrow">{t("guidesEyebrow")}</p>
        <h2>{t("guidesTitle")}</h2>
        <p>{t("guidesDescription")}</p>
        {recentGuides.length > 0 && (
          <div className="card-grid home-guides-grid">
            {recentGuides.map((guide) => (
              <Link
                className="public-card guide-list-card"
                href={`/guides/${guide.slug}`}
                key={guide.id}
                // Bloc 91/F6: skip the per-card RSC prefetch on this grid.
                prefetch={false}
              >
                {guide.coverImage ? (
                  <div className="guide-list-media">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Guide covers accept administrator-provided absolute URLs. */}
                    <img
                      src={guide.coverImage}
                      alt=""
                      className="guide-list-cover"
                    />
                  </div>
                ) : null}
                <div className="guide-list-copy">
                  <h3>{localizedText(guide.title, locale)}</h3>
                  <p>{localizedText(guide.excerpt, locale)}</p>
                  <span className="guide-list-cta">
                    {guidesT("read-guide")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
