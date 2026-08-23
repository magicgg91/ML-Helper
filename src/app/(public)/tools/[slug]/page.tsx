import { notFound, redirect } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";
import { RankingCalculator } from "../../../../components/ranking-calculator";
import { SkillsCalculators } from "../../../../components/skills-calculators";
import { CombatCalculators } from "../../../../components/combat-calculators";
import { getRankingConfig } from "../../../../lib/ranking";
import { getCalculatorAvailability } from "../../../../lib/calculators-server";
import {
  getCityParameters,
  getTemplarParameters,
  getCombatParameters,
} from "../../../../lib/admin-formulas-server";
import { getTranslations } from "next-intl/server";

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tools = await getTranslations("tools");
  const active = await getCalculatorAvailability();
  if (slug === "referentiels") redirect("/guides#references");
  if (!["villes", "combat", "classement", "competences"].includes(slug))
    notFound();
  if (slug === "combat") {
    const combat = await getCombatParameters();
    return (
      <main className="public-main">
        <h1 className="sr-only">{tools("combat")}</h1>
        <CombatCalculators
          cityParameters={await getCityParameters()}
          {...combat}
          availability={{
            xp: active["xp-gain-rate"],
            demo: active["demo-attack-troops"],
          }}
        />
      </main>
    );
  }
  if (slug === "competences")
    return (
      <main className="public-main">
        <h1 className="sr-only">{tools("skills")}</h1>
        <SkillsCalculators
          templarParameters={await getTemplarParameters()}
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
        <h1 className="sr-only">{tools("ranking")}</h1>
        {active.ranking ? (
          <RankingCalculator config={config} />
        ) : (
          <p className="empty-state">{tools("calculator-unavailable")}</p>
        )}
      </main>
    );
  }
  return (
    <main className="public-main">
      <h1 className="sr-only">{tools("cities")}</h1>
      <CityCalculators
        parameters={await getCityParameters()}
        availability={{
          cost: active["city-cost"],
          "max-level": active["city-max-level"],
          production: active["city-production"],
          rewards: active["city-rewards"],
        }}
      />
    </main>
  );
}
