import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { localizedText } from "@/lib/translations";
import { GuidesHub } from "@/components/guides-hub";
import { getTranslations } from "next-intl/server";
import { parseGuideCategories } from "@/lib/guide-categories";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Public"),
    getLocale(),
  ]);
  return pageMetadata({
    locale,
    path: "/guides",
    title: t("guides"),
    description: t("descriptions.guides"),
  });
}

export default async function GuidesPage() {
  await connection();
  const locale = await getLocale();
  const tHome = await getTranslations("Home");
  const guides = await prisma.guide.findMany({
    where: { status: "published", active: true },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <main className="public-main">
      {/* Bloc 53/D: same title + intro sentence as the homepage's guides
          section, so /guides reads as the same entry point reached a
          different way (Bloc 38/K's treatment for /tools). */}
      <h1 className="guides-page-title">{tHome("guidesTitle")}</h1>
      <p>{tHome("guidesDescription")}</p>
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
