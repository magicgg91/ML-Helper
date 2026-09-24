"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { TabLabel } from "./tab-label";
import { GameImage } from "./game-image";

// Bloc 129 §3.8 : chaque onglet porte aussi sa vignette et son nombre
// d'outils. Les images sont celles des cartes de catégorie — une seule
// source (tool-category-grid.tsx) pour les deux endroits.
const categories = [
  { label: "cities", slug: "villes", image: "/tools/cities.webp" },
  { label: "combat", slug: "combat", image: "/tools/fight.webp" },
  { label: "ranking", slug: "classement", image: "/tools/ranking.webp" },
  { label: "skills", slug: "competences", image: "/tools/skills.webp" },
] as const;

export function ToolCategoryNav({
  availability,
  counts,
}: {
  availability: Record<string, boolean>;
  /** Le nombre d'outils actifs par catégorie (§3.8), en chasse fixe. */
  counts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const t = useTranslations("tools");
  return (
    <nav className="category-nav" aria-label={t("navigation-label")}>
      {categories.map((category) =>
        availability[category.slug] ? (
          <Link
            className="category-btn"
            aria-current={
              pathname === `/tools/${category.slug}` ? "page" : undefined
            }
            href={`/tools/${category.slug}`}
            key={category.slug}
          >
            <span className="category-btn-thumb">
              <GameImage
                src={category.image}
                alt=""
                width={120}
                height={120}
                fallback={null}
              />
            </span>
            <span className="category-btn-name">{t(category.label)}</span>
            {counts?.[category.slug] !== undefined && (
              <span className="category-btn-count">
                {counts[category.slug]}
              </span>
            )}
          </Link>
        ) : (
          <button
            className="category-btn"
            // Bloc 94 (Codex PR #119): a category whose calculators are all
            // disabled still has a routable page, and this branch used to drop
            // the current-page marker entirely. With the tool <h1> sr-only and
            // the breadcrumb gone, that left the page with nothing visible
            // saying which category is open. aria-current also exposes the
            // state to assistive tech, which this branch never did.
            aria-current={
              pathname === `/tools/${category.slug}` ? "page" : undefined
            }
            disabled
            key={category.slug}
            title={t("unavailable")}
          >
            <TabLabel label={t(category.label)} badge={t("unavailable")} />
          </button>
        ),
      )}
    </nav>
  );
}
