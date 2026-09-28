import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClockIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { hasLocalizedText, localizedText } from "@/lib/translations";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Breadcrumb } from "@/components/public-breadcrumb";
import { GuideToc } from "@/components/guide-toc";
import { ReportErrorLink } from "@/components/report-error-link";
import { guideOutline } from "@/lib/guide-outline";
import { parseGuideCategories } from "@/lib/guide-categories";
import { plainText } from "@/lib/plain-text";
import { readingMinutes } from "@/lib/reading-time";
import { contactPageLabel } from "@/lib/contact-link";
import { pageTitle } from "@/lib/page-title";
import { pageMetadata } from "@/lib/page-metadata";
import { JsonLd } from "@/components/json-ld";
import { articleJsonLd } from "@/lib/structured-data";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const guide = await prisma.guide.findFirst({
    where: { slug, status: "published" },
  });
  if (!guide) return {};
  const t = await getTranslations("Public");
  return pageMetadata({
    locale,
    path: `/guides/${slug}`,
    title: pageTitle(t("guides"), localizedText(guide.title, locale) || slug),
    // Bloc 42/J: the guide's own excerpt when THIS locale actually has one
    // — much more useful than a generic sentence — falling back to a
    // generic, page-type description (never empty) otherwise. Codex review
    // (PR #68): hasLocalizedText(), not localizedText() — the latter falls
    // back to fr/en, which would silently put a French or English excerpt
    // in the description while the page body shows the "not translated"
    // placeholder (Bloc 42/F) for that same locale.
    description: hasLocalizedText(guide.excerpt, locale)
      ? // Bloc 129 §1.4 : sans son balisage — une méta-description n'a que
        // faire des astérisques d'un gras.
        plainText(localizedText(guide.excerpt, locale))
      : t("descriptions.guide-fallback"),
    // Bloc 91/E3: a guide is an article — its OG card carries the publish and
    // last-modified dates and the cover image when one is set.
    article: {
      publishedTime: guide.publishedAt?.toISOString(),
      modifiedTime: guide.updatedAt?.toISOString(),
      image: guide.coverImage,
    },
  });
}

export default async function GuidePage({
  params,
}: PageProps<"/[locale]/guides/[slug]">) {
  const { slug } = await params;
  await connection();
  const locale = await getLocale();
  const [t, nav, publicT] = await Promise.all([
    getTranslations("guides"),
    getTranslations("Navigation"),
    getTranslations("Public"),
  ]);
  const guide = await prisma.guide.findFirst({
    where: { slug, status: "published" },
  });
  if (!guide) notFound();
  const categories = parseGuideCategories(guide.category);
  const guideTitle =
    localizedText(guide.title, locale) || slug.replaceAll("-", " ");
  const translated = hasLocalizedText(guide.content, locale);
  const content = translated ? localizedText(guide.content, locale) : "";
  const headings = guideOutline(content);
  // Bloc 129 §3.5 : « Continuer avec » propose les guides suivants dans
  // l'ordre de l'index, en revenant au début une fois la fin atteinte.
  const published = await prisma.guide.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, slug: true, title: true, coverImage: true },
  });
  const index = published.findIndex((entry) => entry.slug === slug);
  const next = published
    .slice(index + 1)
    .concat(published.slice(0, Math.max(index, 0)))
    .slice(0, 2);
  return (
    <main className="public-main guide-page">
      {/* Bloc 91/M4: Article structured data (dates, language, cover). */}
      <JsonLd
        data={articleJsonLd({
          locale,
          path: `/guides/${slug}`,
          title: localizedText(guide.title, locale) || slug,
          author: guide.author,
          publishedTime: guide.publishedAt?.toISOString(),
          modifiedTime: guide.updatedAt?.toISOString(),
          image: guide.coverImage,
        })}
      />
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { path: "/", label: nav("home") },
          { path: "/guides", label: nav("guides") },
          { path: `/guides/${slug}`, label: guideTitle },
        ]}
      />
      {/* Bloc 129 §2.3 : le fil d'Ariane visible revient, au-dessus du titre.
          Le Bloc 94 l'avait retiré ; seules ses données structurées étaient
          restées. */}
      <Breadcrumb
        label={nav("breadcrumb")}
        items={[
          { label: nav("home"), href: "/" },
          { label: nav("guides"), href: "/guides" },
          { label: guideTitle },
        ]}
      />
      <header className="guide-header">
        <div className="guide-header-copy">
          <p className="eyebrow">
            {t("detail.eyebrow", {
              category: categories
                .map((category) => t(`categories.${category}`))
                .join(" · "),
            })}
          </p>
          <h1 id="guide-top">{guideTitle}</h1>
          <p className="guide-lead">
            {plainText(localizedText(guide.excerpt, locale))}
          </p>
          {/* §3.5 : des pastilles, sans émoji. Le temps de lecture est
              calculé ; le niveau du guide n'existe pas dans le modèle de
              données, donc rien n'est affiché à sa place (§5). */}
          <ul className="guide-meta">
            <li>
              <ClockIcon aria-hidden="true" size={14} />
              {t("detail.reading-time", { minutes: readingMinutes(content) })}
            </li>
          </ul>
        </div>
        <div className="guide-header-media">
          {guide.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- Guide covers accept administrator-provided absolute URLs.
            <img src={guide.coverImage} alt="" />
          ) : (
            <span className="image-placeholder">
              {publicT("image-placeholder")}
            </span>
          )}
        </div>
      </header>
      <div className="guide-body">
        <aside className="guide-aside">
          <GuideToc
            headings={headings}
            label={t("detail.toc")}
            introLabel={t("detail.intro")}
          />
          <ReportErrorLink
            label={publicT("report-error")}
            page={contactPageLabel(nav("guides"), guideTitle)}
          />
        </aside>
        <article className="guide-shell">
          {/* Bloc 42/F: guides are only really written by hand in FR/EN — a
              missing translation for the active locale shows a visible
              notice instead of silently substituting another language. */}
          {translated ? (
            <MarkdownRenderer
              markdown={content}
              breaks
              guideBlocks={{
                callout: t("detail.callout"),
                illustration: publicT("image-placeholder"),
              }}
            />
          ) : (
            <p className="empty-state">{t("detail.not-translated")}</p>
          )}
        </article>
      </div>
      {next.length > 0 && (
        <section className="guide-continue" aria-labelledby="guide-continue">
          <h2 id="guide-continue">{t("detail.continue")}</h2>
          <ul>
            {next.map((entry) => (
              <li key={entry.id}>
                <Link href={`/guides/${entry.slug}`} prefetch={false}>
                  <span className="guide-continue-thumb">
                    {entry.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Guide covers accept administrator-provided absolute URLs.
                      <img src={entry.coverImage} alt="" />
                    ) : (
                      <span className="image-placeholder">
                        {publicT("image-placeholder")}
                      </span>
                    )}
                  </span>
                  <span className="guide-continue-copy">
                    <span className="eyebrow">{t("detail.kind")}</span>
                    <span className="guide-continue-title">
                      {localizedText(entry.title, locale)}
                    </span>
                  </span>
                  <span className="guide-continue-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
