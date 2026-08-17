import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";

export default async function GuidePage({
  params,
}: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  await connection();
  const guide = await prisma.guide.findFirst({
    where: { slug, status: "published" },
  });
  if (!guide) notFound();
  const title = guide.title as Record<string, string>;
  const content = guide.content as Record<string, string>;
  return (
    <main className="public-main">
      <article className="guide-shell">
        <p className="eyebrow">Guide · {guide.category}</p>
        <h1>{title.fr ?? title.en ?? slug.replaceAll("-", " ")}</h1>
        <div>{content.fr ?? content.en ?? ""}</div>
      </article>
    </main>
  );
}
