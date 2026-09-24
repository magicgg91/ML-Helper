import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../../services/setup-superadmin";
import { getLocale, getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import {
  ToolCategoryGrid,
  toolCategories,
} from "@/components/tool-category-grid";
import { HomeHero, type HeroEntry } from "@/components/home-hero";
import { HomeGuides, type GuideEntry } from "@/components/home-guides";
import { HomeReferenceRow } from "@/components/home-reference-row";
import { ReportBanner } from "@/components/report-banner";
import { ReportErrorLink } from "@/components/report-error-link";
import { referenceCatalog, referenceHref } from "@/lib/reference-catalog";
import { plainText } from "@/lib/plain-text";
import { mostUsedEntries, resolveFeaturedGuide } from "@/lib/site-highlights";
import {
  toolCategoryLabelKeys,
  toolCategoryOf,
  toolEntryHref,
} from "@/lib/tool-links";
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
  const [t, publicT, tools, guidesT, references, active, locale, guides] =
    await Promise.all([
      getTranslations("Home"),
      getTranslations("Public"),
      getTranslations("tools"),
      getTranslations("guides"),
      getTranslations("references"),
      getCalculatorAvailability(),
      getLocale(),
      prisma.guide.findMany({
        where: { status: "published" },
        orderBy: { publishedAt: "desc" },
      }),
    ]);
  const rootT = await getTranslations();

  // Bloc 129 §3.1 : les trois compteurs sont calculés, pas écrits. Ils
  // comptent ce qui est réellement accessible — un outil désactivé en
  // administration disparaît du site, il n'a pas à être annoncé ici.
  const activeTools = toolCategories
    .flatMap((category) => category.calculators)
    .filter((slug) => active[slug]);
  const activeReferences = referenceCatalog.filter(
    (reference) => active[reference.calculatorSlug],
  );

  const categoryImage = new Map(
    toolCategories.map((category) => [category.slug, category.image]),
  );
  const entries: HeroEntry[] = mostUsedEntries.flatMap((entry) => {
    if (entry.kind === "tool") {
      const href = toolEntryHref(entry.slug);
      const category = toolCategoryOf(entry.slug);
      if (!href || !category || !active[entry.slug]) return [];
      return [
        {
          href,
          label: rootT(`${entry.slug}.name`),
          type: t("entry-tool", {
            category: tools(toolCategoryLabelKeys[category]),
          }),
          image: categoryImage.get(category) ?? "",
        },
      ];
    }
    const reference = activeReferences.find(
      (candidate) => candidate.calculatorSlug === entry.slug,
    );
    if (!reference) return [];
    return [
      {
        href: referenceHref(reference.slug),
        label: references(`catalog.${reference.slug}`),
        type: t("entry-reference"),
        image: reference.image,
      },
    ];
  });

  const featured = resolveFeaturedGuide(guides);
  const guideEntry = (guide: (typeof guides)[number]): GuideEntry => ({
    href: `/guides/${guide.slug}`,
    title: localizedText(guide.title, locale),
    // §1.4 : le résumé perd son balisage — il s'affichait « **Million
    // Lords** », astérisques comprises.
    excerpt: plainText(localizedText(guide.excerpt, locale)),
    image: guide.coverImage,
  });

  return (
    <main className="public-main home-page">
      {/* Bloc 91/M4: WebSite + Organization structured data for the home page. */}
      <JsonLd data={websiteJsonLd(locale)} />
      <HomeHero
        eyebrow={t("eyebrow")}
        title={t("h1")}
        intro={t("intro")}
        primary={{ href: "/tools", label: t("explore-tools") }}
        secondary={
          featured
            ? { href: `/guides/${featured.slug}`, label: t("start-guide") }
            : undefined
        }
        counters={[
          t("count-tools", { count: activeTools.length }),
          t("count-references", { count: activeReferences.length }),
          t("count-guides", { count: guides.length }),
        ]}
        panelTitle={t("most-used")}
        entries={entries}
      />
      <section className="home-section home-tools">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">{t("toolsEyebrow")}</p>
            <h2>{t("toolsTitle")}</h2>
            <p className="home-section-lead">{t("toolsDescription")}</p>
          </div>
          <Link className="home-section-all" href="/tools">
            {t("all-tools")} →
          </Link>
        </div>
        <ToolCategoryGrid active={active} locale={locale} t={tools} />
      </section>
      {/* Bloc 50 Group3: three independently-ordered sections (Outils,
          Référentiels, Guides), each keeping the same 1-click,
          no-detour-via-/guides or /referentiels principle. */}
      <section className="home-section home-references">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">{t("referentielsEyebrow")}</p>
            <h2>{t("referentielsTitle")}</h2>
            <p className="home-section-lead">{t("referentielsDescription")}</p>
          </div>
          <Link className="home-section-all" href="/referentiels">
            {t("all-references")} →
          </Link>
        </div>
        <HomeReferenceRow
          entries={activeReferences.map((reference) => ({
            href: referenceHref(reference.slug),
            label: references(`catalog.${reference.slug}`),
            image: reference.image,
          }))}
        />
      </section>
      <section className="home-section home-guides">
        <div className="home-section-head">
          <div>
            <p className="eyebrow">{t("guidesEyebrow")}</p>
            <h2>{t("guidesTitle")}</h2>
            <p className="home-section-lead">{t("guidesDescription")}</p>
          </div>
          <Link className="home-section-all" href="/guides">
            {t("all-guides")} →
          </Link>
        </div>
        <HomeGuides
          featured={
            featured
              ? {
                  ...guideEntry(featured),
                  badge: t("start-here"),
                  cta: guidesT("read-guide"),
                }
              : undefined
          }
          others={guides
            .filter((guide) => guide.id !== featured?.id)
            .slice(0, 5)
            .map(guideEntry)}
          placeholderLabel={publicT("image-placeholder")}
        />
      </section>
      <ReportBanner
        title={t("banner-title")}
        text={t("banner-text")}
        action={
          <ReportErrorLink
            label={publicT("report-error")}
            className="report-error-primary"
          />
        }
      />
    </main>
  );
}
