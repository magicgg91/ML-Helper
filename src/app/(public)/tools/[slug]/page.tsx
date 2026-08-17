import { notFound } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";
import { RankingCalculator } from "../../../../components/ranking-calculator";
import { SkillsCalculators } from "../../../../components/skills-calculators";
import { ReferenceTables } from "../../../../components/reference-tables";
import { getRankingConfig } from "../../../../lib/ranking";
import { getCalculatorAvailability } from "../../../../lib/calculators-server";
import {
  getCombatReferenceRows,
  getExpeditionReferenceRows,
  getTemplarCostRows,
} from "../../../../lib/reference-equipment-server";

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const active = await getCalculatorAvailability();
  if (!["villes", "classement", "competences", "referentiels"].includes(slug))
    notFound();
  if (slug === "referentiels")
    return (
      <main className="public-main">
        <p className="eyebrow">Catégorie</p>
        <h1>Référentiels</h1>
        <p className="lead">
          Consulte et filtre les équipements de combat et d’expédition.
        </p>
        <ReferenceTables
          combatRows={await getCombatReferenceRows()}
          expeditionRows={await getExpeditionReferenceRows()}
          availability={{
            combat: active["combat-equipment"],
            expedition: active["expedition-equipment"],
          }}
        />
      </main>
    );
  if (slug === "competences")
    return (
      <main className="public-main">
        <p className="eyebrow">Catégorie</p>
        <h1>Compétences</h1>
        <p className="lead">
          Optimise tes gemmes et planifie séparément chacun de tes Templiers.
        </p>
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
        <p className="eyebrow">Catégorie</p>
        <h1>Classement</h1>
        <p className="lead">
          Convertis ton rang et ton pourcentage en plages de promotion, maintien
          ou descente.
        </p>
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
      <p className="eyebrow">Catégorie</p>
      <h1>Villes</h1>
      <p className="lead">
        Planifie tes upgrades et mesure précisément ta production en ligue
        Légende.
      </p>
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
