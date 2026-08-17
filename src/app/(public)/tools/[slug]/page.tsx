import { notFound } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";
import { RankingCalculator } from "../../../../components/ranking-calculator";
import { SkillsCalculators } from "../../../../components/skills-calculators";
import { ReferenceTables } from "../../../../components/reference-tables";
import { getRankingConfig } from "../../../../lib/ranking";
import {
  getCombatReferenceRows,
  getExpeditionReferenceRows,
  getTemplarCostRows,
} from "../../../../lib/reference-equipment-server";

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
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
        <SkillsCalculators templarCostTable={await getTemplarCostRows()} />
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
        <RankingCalculator config={config} />
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
      <CityCalculators />
    </main>
  );
}
