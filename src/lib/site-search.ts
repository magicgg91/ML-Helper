import { calculatorCatalog } from "./calculator-catalog";
import { referenceCatalog, referenceHref } from "./reference-catalog";

export type SiteSearchGuide = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
};

export type SiteSearchResultType = "guide" | "reference" | "tool";

export type SiteSearchResult = {
  type: SiteSearchResultType;
  id: string;
  label: string;
  href: string;
};

// Bloc 48/F: keyed by calculatorSlug, not the public `slug` — the two
// diverge for the Shop reference (public slug "shop", calculatorSlug
// "consommables" unchanged), and this set exists specifically to match
// calculatorCatalog[].slug entries below (CalculatorSlug-typed), not
// referenceCatalog[].slug.
const referenceSlugs = new Set<string>(
  referenceCatalog.map((reference) => reference.calculatorSlug),
);

export function buildSiteSearchResults({
  query,
  locale,
  guides,
  translate,
}: {
  query: string;
  locale: string;
  guides: SiteSearchGuide[];
  translate: (key: string) => string;
}): SiteSearchResult[] {
  const normalized = query.trim().toLocaleLowerCase(locale);
  if (!normalized) return [];
  const matches = (value: string) =>
    value.toLocaleLowerCase(locale).includes(normalized);

  const guideResults: SiteSearchResult[] = guides
    .filter((guide) => matches(`${guide.title} ${guide.excerpt}`))
    .map((guide) => ({
      type: "guide",
      id: `guide-${guide.id}`,
      label: guide.title,
      href: `/guides/${guide.slug}`,
    }));

  const referenceResults: SiteSearchResult[] = referenceCatalog
    .map((reference) => ({
      reference,
      label: translate(`references.catalog.${reference.slug}`),
    }))
    .filter(({ label }) => matches(label))
    .map(({ reference, label }) => ({
      type: "reference",
      id: `reference-${reference.slug}`,
      label,
      href: referenceHref(reference.slug),
    }));

  const toolResults: SiteSearchResult[] = calculatorCatalog
    .filter((calculator) => !referenceSlugs.has(calculator.slug))
    .map((calculator) => ({
      calculator,
      label: translate(`${calculator.slug}.name`),
    }))
    .filter(({ label }) => matches(label))
    .map(({ calculator, label }) => ({
      type: "tool",
      id: `tool-${calculator.slug}`,
      label,
      href: `/tools/${calculator.category}`,
    }));

  return [...guideResults, ...referenceResults, ...toolResults];
}
