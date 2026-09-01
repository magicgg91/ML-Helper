import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../services/setup-superadmin";
import { getLocale, getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import { ReferenceCatalogGrid } from "@/components/reference-catalog-grid";
import { localizedText } from "@/lib/translations";
import { prisma } from "@/lib/prisma";
import { languageAlternates } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home");
  return {
    title: "ML Helper",
    description: t("intro"),
    alternates: { languages: languageAlternates("/") },
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
      {/* Bloc 34/D: a short intro sentence replaces the carousel/hero — the
          tool category grid below is the actual point of the homepage and
          should stay visible without scrolling. */}
      <section className="home-intro">
        <p>{t("intro")}</p>
      </section>
      <section className="home-tools">
        <p className="eyebrow">{t("toolsEyebrow")}</p>
        <h2>{t("toolsTitle")}</h2>
        <p>{t("toolsDescription")}</p>
        <ToolCategoryGrid active={active} t={tools} />
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
        <ReferenceCatalogGrid t={references} limit={8} active={active} />
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
