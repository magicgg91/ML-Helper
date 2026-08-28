import Link from "next/link";
import type { getTranslations } from "next-intl/server";
import type {
  CalculatorAvailability,
  CalculatorSlug,
} from "@/lib/calculator-catalog";
import { GameImage } from "./game-image";

// Bloc 33/A: shared between /tools (unchanged) and the homepage (now a
// direct 1-click entry point instead of a marketing teaser linking to
// /tools) — same categories/layout, reused rather than duplicated.
// Bloc 36/B: `image` is the real AI-generated illustration delivered for
// each category (single source of truth for both pages); `fallbackImage`
// is the previous placeholder icon, shown instead if the file is ever
// missing (GameImage) instead of a broken-image icon.
export const toolCategories: Array<{
  label: "cities" | "combat" | "ranking" | "skills";
  slug: string;
  calculators: CalculatorSlug[];
  image: string;
  fallbackImage: string;
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
    fallbackImage: "/category-cities.svg",
  },
  {
    label: "combat",
    slug: "combat",
    calculators: ["xp-gain-rate", "demo-attack-troops"],
    image: "/tools/fight.webp",
    fallbackImage: "/category-combat.svg",
  },
  {
    label: "ranking",
    slug: "classement",
    calculators: ["ranking"],
    image: "/tools/ranking.webp",
    fallbackImage: "/category-ranking.svg",
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
    fallbackImage: "/category-skills.svg",
  },
];

export function ToolCategoryGrid({
  active,
  t,
}: {
  active: CalculatorAvailability;
  t: Awaited<ReturnType<typeof getTranslations<"tools">>>;
}) {
  return (
    <div className="tool-category-grid">
      {toolCategories.map((category) => {
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
                eager={category.slug === "villes"}
                fallback={
                  // eslint-disable-next-line @next/next/no-img-element -- static bundled placeholder icon, no next/image benefit for a tiny SVG.
                  <img src={category.fallbackImage} alt="" />
                }
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
      })}
    </div>
  );
}
