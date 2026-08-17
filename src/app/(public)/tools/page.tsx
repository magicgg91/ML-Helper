import Link from "next/link";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import type { CalculatorSlug } from "@/lib/calculator-catalog";

const categories: Array<{
  label: string;
  slug: string;
  calculators: CalculatorSlug[];
}> = [
  {
    label: "Villes",
    slug: "villes",
    calculators: ["city-cost", "city-max-level", "city-production"],
  },
  { label: "Classement", slug: "classement", calculators: ["ranking"] },
  {
    label: "Compétences",
    slug: "competences",
    calculators: ["stuff-simulator", "stuff-comparison", "gems", "templars"],
  },
  {
    label: "Référentiels",
    slug: "referentiels",
    calculators: ["combat-equipment", "expedition-equipment"],
  },
];

export default async function ToolsPage() {
  const active = await getCalculatorAvailability();
  return (
    <main className="public-main">
      <p className="eyebrow">Simulateurs</p>
      <h1>Outils Million Lords</h1>
      <p className="lead">
        La structure est prête. Les calculateurs seront raccordés lors des
        prochaines étapes de la Phase 2.
      </p>
      <div className="card-grid">
        {categories.map((category) => {
          const count = category.calculators.filter(
            (slug) => active[slug],
          ).length;
          const available = count > 0;
          return (
            <article
              className={`public-card${available ? "" : " public-card-disabled"}`}
              key={category.slug}
              data-disabled={!available || undefined}
              title={!available ? "Indisponible actuellement" : undefined}
            >
              <h2>{category.label}</h2>
              <p>
                {available
                  ? `${count} outil(s) disponible(s).`
                  : "Simulateurs à venir."}
              </p>
              {available && (
                <Link href={`/tools/${category.slug}`}>
                  Ouvrir la catégorie
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
