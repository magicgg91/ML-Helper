export default async function GuidePage({
  params,
}: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  return (
    <main className="public-main">
      <article className="guide-shell">
        <p className="eyebrow">Guide · Brouillon structurel</p>
        <h1>{slug.replaceAll("-", " ")}</h1>
        <p>
          Le contenu de guide sera fourni et publié depuis le back-office lors
          d’une phase ultérieure.
        </p>
      </article>
    </main>
  );
}
