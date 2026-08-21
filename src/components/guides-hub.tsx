"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";

export type PublicGuideCard = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
};

export function GuidesHub({ guides }: { guides: PublicGuideCard[] }) {
  const t = useTranslations("GuidesHub");
  const guideCategories = useMemo(
    () => [...new Set(guides.map(({ category }) => category))].sort(),
    [guides],
  );
  const [guideCategory, setGuideCategory] = useState("all");
  const [referenceCategory, setReferenceCategory] = useState("all");
  const visibleGuides = guides.filter(
    ({ category }) => guideCategory === "all" || category === guideCategory,
  );
  const visibleReferences = referenceCatalog.filter(
    ({ category }) =>
      referenceCategory === "all" || category === referenceCategory,
  );

  return (
    <>
      <section aria-labelledby="guide-section-title">
        <h2 id="guide-section-title">{t("guidesTitle")}</h2>
        <nav className="category-nav" aria-label={t("guideFiltersLabel")}>
          {["all", ...guideCategories].map((category) => (
            <button
              className="category-btn"
              type="button"
              aria-pressed={guideCategory === category}
              key={category}
              onClick={() => setGuideCategory(category)}
            >
              {category === "all" ? t("all") : category}
            </button>
          ))}
        </nav>
        {visibleGuides.length ? (
          <div className="card-grid">
            {visibleGuides.map((guide) => (
              <article className="public-card" key={guide.id}>
                <p className="eyebrow">{guide.category}</p>
                <h3>{guide.title}</h3>
                <p>{guide.excerpt}</p>
                <Link href={`/guides/${guide.slug}`}>{t("readGuide")}</Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">{t("emptyGuides")}</p>
        )}
      </section>

      <section
        className="guides-reference-section"
        id="references"
        aria-labelledby="reference-section-title"
      >
        <h2 id="reference-section-title">{t("referencesTitle")}</h2>
        <nav className="category-nav" aria-label={t("referenceFiltersLabel")}>
          {["all", "combat", "expedition"].map((category) => (
            <button
              className="category-btn"
              type="button"
              aria-pressed={referenceCategory === category}
              key={category}
              onClick={() => setReferenceCategory(category)}
            >
              {t(category)}
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
                <h3>{t(reference.slug)}</h3>
                <span>{t("openReference")}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
