import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { localizedText } from "@/lib/translations";

export default async function GuidePage({
  params,
}: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  await connection();
  const locale = await getLocale();
  const guide = await prisma.guide.findFirst({
    where: { slug, status: "published" },
  });
  if (!guide) notFound();
  return (
    <main className="public-main">
      <article className="guide-shell">
        <p className="eyebrow">Guide · {guide.category}</p>
        <h1>
          {localizedText(guide.title, locale) || slug.replaceAll("-", " ")}
        </h1>
        <div>{localizedText(guide.content, locale)}</div>
      </article>
    </main>
  );
}
