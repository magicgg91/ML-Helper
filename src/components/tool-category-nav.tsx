"use client";

import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SelectionBanner, SelectionTab } from "./selection-banner";

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
    // Bloc 132 §8 : la forme du bandeau vient de SelectionBanner, la même
    // que celle des référentiels.
    <SelectionBanner navLabel={t("navigation-label")} columns={4}>
      {categories.map((category) => {
        const current = pathname === `/tools/${category.slug}`;
        return availability[category.slug] ? (
          <SelectionTab
            key={category.slug}
            href={`/tools/${category.slug}`}
            image={category.image}
            label={t(category.label)}
            current={current}
          >
            {counts?.[category.slug] !== undefined && (
              <span className="selection-tab-count">
                {counts[category.slug]}
              </span>
            )}
          </SelectionTab>
        ) : (
          // Bloc 94 (Codex PR #119) : une catégorie dont tous les outils sont
          // désactivés garde une page. Son <h1> est réservé aux lecteurs
          // d'écran et le fil d'Ariane a disparu : cet onglet est le seul
          // repère visible qui dit qu'on y est, d'où `current` ici aussi.
          <SelectionTab
            key={category.slug}
            element="button"
            title={t("unavailable")}
            image={category.image}
            label={t(category.label)}
            badge={t("unavailable")}
            current={current}
          />
        );
      })}
    </SelectionBanner>
  );
}
