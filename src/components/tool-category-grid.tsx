import { Link } from "@/i18n/navigation";
import type { getTranslations } from "next-intl/server";
import type {
  CalculatorAvailability,
  CalculatorSlug,
} from "@/lib/calculator-catalog";
import { sortByLabel } from "@/lib/sort-by-label";
import { GameImage } from "./game-image";

// Bloc 33/A: shared between /tools (unchanged) and the homepage (now a
// direct 1-click entry point instead of a marketing teaser linking to
// /tools) — same categories/layout, reused rather than duplicated.
// Bloc 36/B: `image` is the real AI-generated illustration delivered for
// each category (single source of truth for both pages).
// Bloc 104: the placeholder icon that used to sit beside it is gone — see
// reference-catalog.ts for why (deleted files, and a preload hint for an
// element that never rendered).
export const toolCategories: Array<{
  label: "cities" | "combat" | "ranking" | "skills";
  slug: string;
  calculators: CalculatorSlug[];
  image: string;
}> = [
  {
    label: "cities",
    slug: "villes",
    calculators: [
      "city-cost",
      "city-max-level",
      "city-production",
      "city-rewards",
    ],
    image: "/tools/cities.webp",
  },
  {
    label: "combat",
    slug: "combat",
    calculators: ["xp-gain-rate", "demo-attack-troops"],
    image: "/tools/fight.webp",
  },
  {
    label: "ranking",
    slug: "classement",
    calculators: ["ranking"],
    image: "/tools/ranking.webp",
  },
  {
    label: "skills",
    slug: "competences",
    calculators: [
      "stuff-simulator",
      "expedition-equipment-simulator",
      "gems",
      "templars",
    ],
    image: "/tools/skills.webp",
  },
];

export function ToolCategoryGrid({
  active,
  locale,
  t,
}: {
  active: CalculatorAvailability;
  // Bloc 64/A: the tiles are ordered by the label actually shown, so the
  // sort needs the visitor's locale (accents, collation) — same rule the
  // admin lists got at Bloc 62/C.
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"tools">>>;
}) {
  return (
    <div className="tool-category-grid">
      {sortByLabel(toolCategories, (item) => t(item.label), locale).map(
        (category, index) => {
          const count = category.calculators.filter(
            (slug) => active[slug],
          ).length;
          const available = count > 0;
          const content = (
            <>
              <div className="tool-category-image">
                <GameImage
                  src={category.image}
                  alt=""
                  width={500}
                  height={500}
                  // Bloc 64/A review: whichever tile the sort puts first is
                  // the LCP image, so eager-loading follows the rendered
                  // position — it used to name Villes, which is only first
                  // while the order is the catalog's own.
                  eager={index === 0}
                  // Bloc 104: nothing, rather than a placeholder image. The
                  // illustration ships with the repo, so it cannot go
                  // missing on its own; and an <img> here is serialised into
                  // the RSC payload and preloaded whether or not it renders.
                  // The .tool-category-image box keeps its square footprint
                  // either way, so a failed load leaves a gap, not a reflow.
                  fallback={null}
                />
              </div>
              <div className="tool-category-copy">
                <h2>{t(category.label)}</h2>
                <strong className="tool-count">{t("count", { count })}</strong>
                {!available && (
                  <span className="tool-unavailable">{t("comingSoon")}</span>
                )}
              </div>
            </>
          );
          return available ? (
            <Link
              className="tool-category-card"
              href={`/tools/${category.slug}`}
              key={category.slug}
              // Bloc 91/F6: skip the per-card RSC prefetch on this grid.
              prefetch={false}
            >
              {content}
            </Link>
          ) : (
            <article
              className="tool-category-card public-card-disabled"
              key={category.slug}
              data-disabled
              title={t("unavailable")}
            >
              {content}
            </article>
          );
        },
      )}
    </div>
  );
}
