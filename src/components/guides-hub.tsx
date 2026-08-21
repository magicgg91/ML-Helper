"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";

export type PublicGuideCard = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
};

export function GuidesHub({ guides }: { guides: PublicGuideCard[] }) {
  const locale = useLocale();
  const t = useTranslations("guides");
  const references = useTranslations("references");
  const guideCategories = useMemo(
    () => [...new Set(guides.map(({ category }) => category))].sort(),
    [guides],
  );
  const [guideCategory, setGuideCategory] = useState("all");
  const [referenceCategory, setReferenceCategory] = useState("all");
  const [guideSearch, setGuideSearch] = useState("");
  const normalizedSearch = guideSearch.trim().toLocaleLowerCase(locale);
  const visibleGuides = guides.filter(
    ({ category, title, excerpt }) =>
      (guideCategory === "all" || category === guideCategory) &&
      (!normalizedSearch ||
        `${title} ${excerpt} ${category}`
          .toLocaleLowerCase(locale)
          .includes(normalizedSearch)),
  );
  const visibleReferences = referenceCatalog.filter(
    ({ category }) =>
      referenceCategory === "all" || category === referenceCategory,
  );

  return (
    <>
      <section aria-labelledby="guide-section-title">
        <h2 id="guide-section-title">{t("sections.guides")}</h2>
        <label>
          {t("search.label")}
          <input
            type="search"
            value={guideSearch}
            onChange={(event) => setGuideSearch(event.target.value)}
            placeholder={t("search.placeholder")}
          />
        </label>
        <nav className="category-nav" aria-label={t("filters.guides-label")}>
          {["all", ...guideCategories].map((category) => (
            <button
              className="category-btn"
              type="button"
              aria-pressed={guideCategory === category}
              key={category}
              onClick={() => setGuideCategory(category)}
            >
              {category === "all" ? t("filters.all") : category}
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
                <Link href={`/guides/${guide.slug}`}>{t("read-guide")}</Link>
              </article>
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
          className="category-nav"
          aria-label={t("filters.references-label")}
        >
          {["all", "combat", "expedition"].map((category) => (
            <button
              className="category-btn"
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
