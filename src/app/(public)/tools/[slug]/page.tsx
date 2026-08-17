export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  return (
    <main className="public-main">
      <p className="eyebrow">Simulateur</p>
      <h1>{slug.replaceAll("-", " ")}</h1>
      <p className="lead">
        Structure du simulateur prête. Aucun calcul fonctionnel n’est encore
        connecté.
      </p>
    </main>
  );
}
