import { absoluteUrl, canonicalUrl } from "./site-url";
import { defaultOgImagePath } from "./page-metadata";

// Bloc 91/M4: builders for the JSON-LD structured data emitted by the public
// pages (rendered by the <JsonLd> component). Kept as pure functions so the
// exact shape is unit-testable without rendering. "ML-Helper" is the site's
// name/publisher; the OG image doubles as the brand logo.
type JsonLdObject = Record<string, unknown>;

const organization: JsonLdObject = {
  "@type": "Organization",
  name: "ML-Helper",
  url: absoluteUrl("/"),
  logo: absoluteUrl(defaultOgImagePath),
};

// Home: the site itself plus its publisher.
export function websiteJsonLd(locale: string): JsonLdObject[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ML-Helper",
      url: canonicalUrl(locale, "/"),
      inLanguage: locale,
    },
    { "@context": "https://schema.org", ...organization },
  ];
}

// A guide: an Article with its dates, language and (when set) cover image.
// Codex review: the guide stores its own author, so use it (a Person) rather
// than emitting the site organization as both author and publisher.
export function articleJsonLd(input: {
  locale: string;
  path: string;
  title: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  image?: string | null;
}): JsonLdObject {
  const url = canonicalUrl(input.locale, input.path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    inLanguage: input.locale,
    mainEntityOfPage: url,
    author: input.author
      ? { "@type": "Person", name: input.author }
      : organization,
    publisher: organization,
    ...(input.publishedTime ? { datePublished: input.publishedTime } : {}),
    ...(input.modifiedTime ? { dateModified: input.modifiedTime } : {}),
    ...(input.image ? { image: input.image } : {}),
  };
}

// A tool page: a free web application in the game category.
export function webApplicationJsonLd(input: {
  locale: string;
  path: string;
  name: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    inLanguage: input.locale,
    url: canonicalUrl(input.locale, input.path),
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR" },
  };
}
