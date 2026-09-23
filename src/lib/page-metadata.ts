import type { Metadata } from "next";
import { canonicalUrl, languageAlternates } from "./site-url";
import { launchLocales } from "./translations";

// Bloc 91/E2: appended to every public page's <title>. "ML-Helper" (the site)
// and "Million Lords" (the game it serves) are proper nouns, identical in every
// language — brand identity, not translatable copy — so this is a single named
// constant, reused by the root layout's title.template and by brandedTitle()
// below. "Million Lords" is the one term players actually search for, so it
// rides on every page title.
const brandSuffix = " | ML-Helper · Million Lords";

// The Next `title.template` form of the same suffix (set once on the root
// layout, applied to every child page's string title).
export const titleTemplate = `%s${brandSuffix}`;

// Open Graph locale codes (og:locale expects e.g. "fr_FR", not "fr").
//
// Bloc 120: an exception table, no longer the whole list. A language's region
// cannot be read off its file name — English is en_US, not en_EN — so the
// ones that differ from the language-repeated form are named here and the
// rest are derived. The previous version fell back to "fr_FR" for anything it
// did not list, which would have tagged a newly-added language's pages as
// French to every crawler and share card.
const ogRegionExceptions: Record<string, string> = { en: "US" };
const localeCode = /^([a-z]{2})(?:-([a-z]{2}))?$/i;

export function ogLocale(locale: string): string {
  const match = localeCode.exec(locale);
  // Anything that is not a locale code keeps the previous safe default rather
  // than producing a malformed og:locale out of it.
  if (!match) return "fr_FR";
  const [, language, region] = match;
  const code = language.toLowerCase();
  return `${code}_${(ogRegionExceptions[code] ?? region ?? code).toUpperCase()}`;
}

// The site-wide generated share image (src/app/opengraph-image.tsx). metadataBase
// resolves this relative path to an absolute URL. A page that sets its own
// `openGraph` replaces the root layout's entirely — including the image the
// file convention would have injected — so every page must name an image here.
export const defaultOgImagePath = "/opengraph-image";

// The full <title>/og:title: a concise page title plus the brand+game suffix.
// The <title> tag reaches this same string through the root layout's
// title.template; og:/twitter: titles get it here because those are NOT run
// through title.template.
export function brandedTitle(title: string): string {
  return `${title}${brandSuffix}`;
}

// Article-specific Open Graph fields (Bloc 91/E3), for guide pages: an og:type
// of "article" plus publish/modify times and a cover image.
export type ArticleOg = {
  publishedTime?: string;
  modifiedTime?: string;
  image?: string | null;
};

// The complete metadata for a public page. Next inherits `openGraph` from the
// root layout but does NOT derive og:title / og:description from the document
// title / description — a page that sets only `title`/`description` would keep
// the layout's site-wide OG title on every shared link. So each page states
// them here, mirroring its own title (branded) and description, alongside the
// canonical + hreflang alternates. `title` is the SHORT page title; the root
// layout's template adds the brand suffix to the <title> tag. Pass `article`
// on a guide page to switch og:type to "article" and add its dates/cover.
export function pageMetadata({
  locale,
  path,
  title,
  description,
  article,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  article?: ArticleOg;
}): Metadata {
  const url = canonicalUrl(locale, path);
  const branded = brandedTitle(title);
  // A guide's own cover when it has one, otherwise the site-wide share image.
  const image = article?.image ?? defaultOgImagePath;
  // A page-level openGraph REPLACES the root layout's rather than deep-merging
  // it (Codex P2), so restate siteName here — and set og:type explicitly per
  // branch (required basic OG field) rather than relying on inheritance.
  const common = {
    siteName: "ML-Helper",
    title: branded,
    description,
    url,
    locale: ogLocale(locale),
    alternateLocale: launchLocales
      .filter((other) => other !== locale)
      .map((other) => ogLocale(other)),
    images: [image],
  };
  const openGraph: Metadata["openGraph"] = article
    ? {
        ...common,
        type: "article",
        ...(article.publishedTime
          ? { publishedTime: article.publishedTime }
          : {}),
        ...(article.modifiedTime ? { modifiedTime: article.modifiedTime } : {}),
      }
    : { ...common, type: "website" };
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph,
    // Setting `twitter` replaces the root layout's card, so restate
    // summary_large_image here (Bloc 91/E3); the image falls back to og:image.
    twitter: { card: "summary_large_image", title: branded, description },
  };
}
