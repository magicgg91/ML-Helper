import Link from "next/link";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import type { CalculatorSlug } from "@/lib/calculator-catalog";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

const categories: Array<{
  label: "cities" | "combat" | "ranking" | "skills";
  slug: string;
  calculators: CalculatorSlug[];
  image: string;
}> = [
  {
    label: "cities",
    slug: "villes",
    calculators: ["city-cost", "city-max-level", "city-production"],
    image: "/category-cities.svg",
  },
  {
    label: "combat",
    slug: "combat",
    calculators: ["xp-gain-rate", "demo-attack-troops"],
    image: "/category-combat.svg",
  },
  {
    label: "ranking",
    slug: "classement",
    calculators: ["ranking"],
    image: "/category-ranking.svg",
  },
  {
    label: "skills",
    slug: "competences",
    calculators: ["stuff-simulator", "stuff-comparison", "gems", "templars"],
    image: "/category-skills.svg",
  },
];

export default async function ToolsPage() {
  const active = await getCalculatorAvailability();
  const t = await getTranslations("tools");
  return (
    <main className="public-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <div className="tool-category-grid">
        {categories.map((category) => {
          const count = category.calculators.filter(
            (slug) => active[slug],
          ).length;
          const available = count > 0;
          return (
            <article
              className={`tool-category-card${available ? "" : " public-card-disabled"}`}
              key={category.slug}
              data-disabled={!available || undefined}
              title={!available ? t("unavailable") : undefined}
            >
              <div className="tool-category-image">
                <Image
                  src={category.image}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
              </div>
              <div className="tool-category-copy">
                <h2>{t(category.label)}</h2>
                <strong className="tool-count">{t("count", { count })}</strong>
                {available && (
                  <Link href={`/tools/${category.slug}`}>{t("open")}</Link>
                )}
                {!available && (
                  <span className="tool-unavailable">{t("comingSoon")}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
