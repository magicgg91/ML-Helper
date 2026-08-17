import { notFound } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  if (slug !== "villes") notFound();
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
