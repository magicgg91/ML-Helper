import { notFound, redirect } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";
import { RankingCalculator } from "../../../../components/ranking-calculator";
import { SkillsCalculators } from "../../../../components/skills-calculators";
import { getRankingConfig } from "../../../../lib/ranking";
import { getCalculatorAvailability } from "../../../../lib/calculators-server";
import { getTemplarCostRows } from "../../../../lib/reference-equipment-server";

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const active = await getCalculatorAvailability();
  if (slug === "referentiels") redirect("/guides#references");
  if (!["villes", "classement", "competences"].includes(slug)) notFound();
  if (slug === "competences")
    return (
      <main className="public-main">
        <h1 className="sr-only">Compétences</h1>
        <SkillsCalculators
          templarCostTable={await getTemplarCostRows()}
          availability={{
            simulator: active["stuff-simulator"],
            comparison: active["stuff-comparison"],
            gems: active.gems,
            templars: active.templars,
          }}
        />
      </main>
    );
  if (slug === "classement") {
    const config = await getRankingConfig();
    return (
      <main className="public-main">
        <h1 className="sr-only">Classement</h1>
        {active.ranking ? (
          <RankingCalculator config={config} />
        ) : (
          <p className="empty-state">
            Ce calculateur est temporairement indisponible.
          </p>
        )}
      </main>
    );
  }
  return (
    <main className="public-main">
      <h1 className="sr-only">Villes</h1>
      <CityCalculators
        availability={{
          cost: active["city-cost"],
          "max-level": active["city-max-level"],
          production: active["city-production"],
        }}
      />
    </main>
  );
}
