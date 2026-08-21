import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { localizedText } from "@/lib/translations";
import { GuidesHub } from "@/components/guides-hub";
import { getTranslations } from "next-intl/server";
import { parseGuideCategories } from "@/lib/guide-categories";

export default async function GuidesPage() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations("guides");
  const guides = await prisma.guide.findMany({
    where: { status: "published", active: true },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <main className="public-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <GuidesHub
        guides={guides.map((guide) => ({
          id: guide.id,
          slug: guide.slug,
          categories: parseGuideCategories(guide.category),
          title: localizedText(guide.title, locale),
          excerpt: localizedText(guide.excerpt, locale),
          coverImage: guide.coverImage,
        }))}
      />
    </main>
  );
}
