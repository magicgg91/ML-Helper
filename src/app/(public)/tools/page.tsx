import type { Metadata } from "next";
import Link from "next/link";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import type { CalculatorSlug } from "@/lib/calculator-catalog";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return { title: t("tools") };
}

const categories: Array<{
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
          const content = (
            <>
              <div className="tool-category-image">
                <Image
                  src={category.image}
                  alt=""
                  fill
                  loading={category.slug === "villes" ? "eager" : "lazy"}
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
              </div>
              <div className="tool-category-copy">
                <h2>{t(category.label)}</h2>
                <strong className="tool-count">{t("count", { count })}</strong>
                {available ? (
                  <span className="tool-category-cta">{t("open")}</span>
                ) : (
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
    </main>
  );
}
