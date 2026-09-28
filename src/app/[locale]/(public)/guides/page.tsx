import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedText } from "@/lib/translations";
import { GuidesHub } from "@/components/guides-hub";
import { Breadcrumb } from "@/components/public-breadcrumb";
import { PageHeader } from "@/components/public-page-header";
import { parseGuideCategories } from "@/lib/guide-categories";
import { pageMetadata } from "@/lib/page-metadata";
import { plainText } from "@/lib/plain-text";
import { guideToolLinks, resolveFeaturedGuide } from "@/lib/site-highlights";
import { toolEntryHref } from "@/lib/tool-links";

export async function generateMetadata(): Promise<Metadata> {
  const [t, guides, locale] = await Promise.all([
    getTranslations("Public"),
    getTranslations("guides"),
    getLocale(),
  ]);
  return pageMetadata({
    locale,
    path: "/guides",
    title: t("guides"),
    description: guides("index-intro"),
  });
}

export default async function GuidesPage() {
  await connection();
  const [locale, t, navigation, publicT, rootT] = await Promise.all([
    getLocale(),
    getTranslations("guides"),
    getTranslations("Navigation"),
    getTranslations("Public"),
    getTranslations(),
  ]);
  const guides = await prisma.guide.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
  });
  const featured = resolveFeaturedGuide(guides);
  return (
    <main className="public-main">
      <Breadcrumb
        label={navigation("breadcrumb")}
        items={[
          { label: navigation("home"), href: "/" },
          { label: navigation("guides") },
        ]}
      />
      <PageHeader title={t("title")} description={t("index-intro")} />
      <GuidesHub
        featuredId={featured?.id}
        placeholderLabel={publicT("image-placeholder")}
        guides={guides.map((guide) => {
          // §3.4 : l'outil associé vient de la configuration. Sans entrée,
          // pas de pastille — le brief donne les associations par titre de
          // guide, et un slug inventé pointerait à côté (voir le PR).
          const toolSlug = guideToolLinks[guide.slug];
          const toolLink = toolSlug ? toolEntryHref(toolSlug) : undefined;
          return {
            id: guide.id,
            slug: guide.slug,
            categories: parseGuideCategories(guide.category),
            title: localizedText(guide.title, locale),
            // §1.4 : le résumé s'affichait avec son markdown brut.
            excerpt: plainText(localizedText(guide.excerpt, locale)),
            coverImage: guide.coverImage,
            tool:
              toolSlug && toolLink
                ? { href: toolLink, label: rootT(`${toolSlug}.name`) }
                : undefined,
          };
        })}
      />
    </main>
  );
}
