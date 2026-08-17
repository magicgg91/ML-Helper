import { notFound } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";
import { RankingCalculator } from "../../../../components/ranking-calculator";
import { getRankingConfig } from "../../../../lib/ranking";

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  if (slug !== "villes" && slug !== "classement") notFound();
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
