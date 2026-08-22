"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";

export type PublicGuideCard = {
  id: string;
  slug: string;
  categories: string[];
  title: string;
  excerpt: string;
  coverImage: string | null;
};

export function GuidesHub({ guides }: { guides: PublicGuideCard[] }) {
  const t = useTranslations("guides");
  const references = useTranslations("references");
  const guideCategories = useMemo(
    () => [...new Set(guides.flatMap(({ categories }) => categories))].sort(),
    [guides],
  );
  const [guideCategory, setGuideCategory] = useState("all");
  const [referenceCategory, setReferenceCategory] = useState("all");
  const visibleGuides = guides.filter(
    ({ categories }) =>
      guideCategory === "all" || categories.includes(guideCategory),
  );
  const visibleReferences = referenceCatalog.filter(
    ({ category }) =>
      referenceCategory === "all" || category === referenceCategory,
  );

  return (
    <>
      <section aria-labelledby="guide-section-title">
        <h2 id="guide-section-title">{t("sections.guides")}</h2>
        <nav
          className="guide-filter-nav"
          aria-label={t("filters.guides-label")}
        >
          {["all", ...guideCategories].map((category) => (
            <button
              className="guide-filter-chip"
              type="button"
              aria-pressed={guideCategory === category}
              key={category}
              onClick={() => setGuideCategory(category)}
            >
              {category === "all"
                ? t("filters.all")
                : t(`categories.${category}`)}
            </button>
          ))}
        </nav>
        {visibleGuides.length ? (
          <div className="card-grid">
            {visibleGuides.map((guide) => (
              <Link
                className="public-card guide-list-card"
                href={`/guides/${guide.slug}`}
                key={guide.id}
              >
                <div className="guide-list-media">
                  {guide.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Guide covers accept administrator-provided absolute URLs.
                    <img
                      src={guide.coverImage}
                      alt=""
                      className="guide-list-cover"
                    />
                  ) : null}
                  {guide.categories[0] && (
                    <span className="guide-list-badge">
                      {t(`categories.${guide.categories[0]}`)}
                      {guide.categories.length > 1
                        ? ` +${guide.categories.length - 1}`
                        : ""}
                    </span>
                  )}
                </div>
                <div className="guide-list-copy">
                  <h3>{guide.title}</h3>
                  <p>{guide.excerpt}</p>
                  <span className="guide-list-cta">{t("read-guide")}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {guides.length ? t("no-results") : t("empty")}
          </p>
        )}
      </section>

      <section
        className="guides-reference-section"
        id="references"
        aria-labelledby="reference-section-title"
      >
        <h2 id="reference-section-title">{t("sections.references")}</h2>
        <nav
          className="guide-filter-nav"
          aria-label={t("filters.references-label")}
        >
          {["all", "combat", "expedition"].map((category) => (
            <button
              className="guide-filter-chip"
              type="button"
              aria-pressed={referenceCategory === category}
              key={category}
              onClick={() => setReferenceCategory(category)}
            >
              {t(`filters.${category}`)}
            </button>
          ))}
        </nav>
        <div className="tool-category-grid">
          {visibleReferences.map((reference) => (
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
                <span>{t("open-reference")}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
