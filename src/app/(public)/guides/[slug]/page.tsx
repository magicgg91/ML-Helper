import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedText } from "@/lib/translations";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { parseGuideCategories } from "@/lib/guide-categories";

export default async function GuidePage({
  params,
}: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  await connection();
  const locale = await getLocale();
  const t = await getTranslations("guides");
  const guide = await prisma.guide.findFirst({
    where: { slug, status: "published", active: true },
  });
  if (!guide) notFound();
  const categories = parseGuideCategories(guide.category);
  return (
    <main className="public-main">
      <article className="guide-shell">
        <p className="eyebrow">
          {t("detail.eyebrow", {
            category: categories
              .map((category) => t(`categories.${category}`))
              .join(" · "),
          })}
        </p>
        <h1>
          {localizedText(guide.title, locale) || slug.replaceAll("-", " ")}
        </h1>
        <MarkdownRenderer markdown={localizedText(guide.content, locale)} />
      </article>
    </main>
  );
}
