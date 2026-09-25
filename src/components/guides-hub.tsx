"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "./button";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type PublicGuideCard = {
  id: string;
  slug: string;
  categories: string[];
  title: string;
  excerpt: string;
  coverImage: string | null;
  /**
   * Bloc 129 §3.4 : l'outil associé au guide, déjà résolu par la page
   * (libellé et lien). Absent quand le guide n'en a pas — la pastille n'est
   * alors pas rendue, plutôt qu'une pastille vide.
   */
  tool?: { href: string; label: string };
};

export function GuidesHub({
  guides,
  featuredId,
  placeholderLabel,
}: {
  guides: PublicGuideCard[];
  /** Le guide de la carte « Commence ici », désigné par la configuration. */
  featuredId?: string;
  /** Le mot posé sur un emplacement d'illustration vide (§1.3). */
  placeholderLabel: string;
}) {
  const t = useTranslations("guides");
  const guideCategories = useMemo(
    () => [...new Set(guides.flatMap(({ categories }) => categories))].sort(),
    [guides],
  );
  const [guideCategory, setGuideCategory] = useState("all");
  const visibleGuides = guides.filter(
    ({ categories }) =>
      guideCategory === "all" || categories.includes(guideCategory),
  );
  // §3.4 : filtres et badges de catégorie n'apparaissent qu'à partir de deux
  // catégories. Avec une seule, ils n'offrent aucun choix et n'apprennent
  // rien — ils reviennent d'eux-mêmes dès qu'un guide d'une autre catégorie
  // est publié.
  const showCategories = guideCategories.length > 1;
  const featured = visibleGuides.find((guide) => guide.id === featuredId);
  const others = visibleGuides.filter((guide) => guide.id !== featured?.id);

  const media = (guide: PublicGuideCard, className: string) => (
    <span className={className}>
      {guide.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Guide covers accept administrator-provided absolute URLs.
        <img src={guide.coverImage} alt="" />
      ) : (
        <span className="image-placeholder">{placeholderLabel}</span>
      )}
    </span>
  );

  return (
    <section aria-labelledby="guide-section-title">
      <h2 className="sr-only" id="guide-section-title">
        {t("sections.guides")}
      </h2>
      {showCategories && (
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
      )}
      {visibleGuides.length ? (
        <>
          {featured && (
            <article className="guide-featured">
              {media(featured, "guide-featured-media")}
              <div className="guide-featured-copy">
                <span className="guide-featured-badge">{t("start-here")}</span>
                <h3>
                  <Link href={`/guides/${featured.slug}`} prefetch={false}>
                    {featured.title}
                  </Link>
                </h3>
                <p>{featured.excerpt}</p>
                <Button href={`/guides/${featured.slug}`} prefetch={false}>
                  {t("read-guide")}
                </Button>
              </div>
            </article>
          )}
          {others.length > 0 && (
            <div className="guide-grid">
              {others.map((guide) => (
                // La carte n'est pas un lien entier : la pastille « Outil »
                // en est un autre, et on n'imbrique pas deux liens.
                <article className="guide-card" key={guide.id}>
                  {media(guide, "guide-card-media")}
                  <div className="guide-card-copy">
                    {showCategories && guide.categories[0] && (
                      <span className="guide-card-badge">
                        {t(`categories.${guide.categories[0]}`)}
                        {guide.categories.length > 1
                          ? ` +${guide.categories.length - 1}`
                          : ""}
                      </span>
                    )}
                    <h3>
                      <Link href={`/guides/${guide.slug}`} prefetch={false}>
                        {guide.title}
                      </Link>
                    </h3>
                    <p>{guide.excerpt}</p>
                    <div className="guide-card-footer">
                      <Link
                        className="guide-card-cta"
                        href={`/guides/${guide.slug}`}
                        prefetch={false}
                      >
                        {t("read-guide")} →
                      </Link>
                      {guide.tool && (
                        <Link
                          className="guide-card-tool"
                          href={guide.tool.href}
                          prefetch={false}
                        >
                          {t("tool-pill", { name: guide.tool.label })}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="empty-state">
          {guides.length ? t("no-results") : t("empty")}
        </p>
      )}
    </section>
  );
}
