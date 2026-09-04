import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { hasLocalizedText, localizedText } from "@/lib/translations";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { parseGuideCategories } from "@/lib/guide-categories";
import { pageTitle } from "@/lib/page-title";
import { canonicalUrl, languageAlternates } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const guide = await prisma.guide.findFirst({
    where: { slug, status: "published", active: true },
  });
  if (!guide) return {};
  const t = await getTranslations("Public");
  return {
    title: pageTitle(t("guides"), localizedText(guide.title, locale) || slug),
    // Bloc 42/J: the guide's own excerpt when THIS locale actually has one
    // — much more useful than a generic sentence — falling back to a
    // generic, page-type description (never empty) otherwise. Codex review
    // (PR #68): hasLocalizedText(), not localizedText() — the latter falls
    // back to fr/en, which would silently put a French or English excerpt
    // in the description while the page body shows the "not translated"
    // placeholder (Bloc 42/F) for that same locale.
    description: hasLocalizedText(guide.excerpt, locale)
      ? localizedText(guide.excerpt, locale)
      : t("descriptions.guide-fallback"),
    alternates: {
      canonical: canonicalUrl(await getLocale(), `/guides/${slug}`),
      languages: languageAlternates(`/guides/${slug}`),
    },
  };
}

export default async function GuidePage({
  params,
}: PageProps<"/[locale]/guides/[slug]">) {
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
        {/* Bloc 42/F: guides are only really written by hand in FR/EN — a
            missing translation for the active locale (any locale,
            including FR/EN between themselves) shows a visible notice
            instead of silently substituting another language's content.
            Scoped to guide content only: static UI text and the legal
            notice keep localizedText()'s silent EN fallback untouched. */}
        {hasLocalizedText(guide.content, locale) ? (
          <MarkdownRenderer markdown={localizedText(guide.content, locale)} />
        ) : (
          <p className="empty-state">{t("detail.not-translated")}</p>
        )}
      </article>
    </main>
  );
}
