import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { localizedText } from "@/lib/translations";

export default async function GuidesPage() {
  await connection();
  const locale = await getLocale();
  const guides = await prisma.guide.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <main className="public-main">
      <p className="eyebrow">Guides</p>
      <h1>Bibliothèque communautaire</h1>
      <p className="lead">Retrouve ici tous les guides actuellement publiés.</p>
      {guides.length ? (
        <div className="card-grid">
          {guides.map((guide) => (
            <article className="public-card" key={guide.id}>
              <p className="eyebrow">{guide.category}</p>
              <h2>{localizedText(guide.title, locale)}</h2>
              <p>{localizedText(guide.excerpt, locale)}</p>
              <Link href={`/guides/${guide.slug}`}>Lire le guide</Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">Aucun guide publié pour le moment.</p>
      )}
    </main>
  );
}
