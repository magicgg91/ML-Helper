import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSuperAdmin } from "../../services/setup-superadmin";
import { getLocale, getTranslations } from "next-intl/server";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import { referenceCatalog, referenceHref } from "@/lib/reference-catalog";
import { localizedText } from "@/lib/translations";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "ML Helper" };

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
        take: 3,
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
      {/* Bloc 34/E: the 3 most recently published guides (same sort as
          /guides) + the references actually built so far — same 1-click,
          no-detour-via-/guides principle as the tools section above. */}
      <section className="home-guides">
        <p className="eyebrow">{t("guidesEyebrow")}</p>
        <h2>{t("guidesTitle")}</h2>
        <p>{t("guidesDescription")}</p>
        {recentGuides.length > 0 && (
          <div className="card-grid">
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
        <div className="tool-category-grid">
          {referenceCatalog.map((reference) => (
            <Link
              className="tool-category-card reference-category-card"
              href={referenceHref(reference.slug)}
              key={reference.slug}
            >
              <div className="tool-category-image">
                <Image
                  src={reference.image}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
              </div>
              <div className="tool-category-copy">
                <h3>{references(`catalog.${reference.slug}`)}</h3>
                <span>{guidesT("open-reference")}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
