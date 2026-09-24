import { Link } from "@/i18n/navigation";
import type { CalculatorAvailability } from "../lib/calculator-catalog";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import { sortByLabel } from "../lib/sort-by-label";
import { GameImage } from "./game-image";

// Bloc 38/O: shared between the homepage and /guides (previously duplicated
// markup in each) — same GameImage treatment as ToolCategoryGrid's tool
// categories, including the aspect-ratio: 1 image box (Bloc 38/H) via the
// shared .tool-category-image class.
// `t` is typed loosely (rather than next-intl/server's exact getTranslations
// return type) since this component is used from both a server page
// (getTranslations) and a client component (useTranslations) — the two
// translator types don't structurally match despite both being callable
// exactly the same way for a plain "catalog.<slug>" lookup.
// Bloc 50 Group3: `limit` caps how many catalog entries render — the
// homepage's teaser section passes 8 to structurally hold a max-4-col/
// max-2-row grid even as the catalog grows past today's 6 entries. Omitted
// (the /referentiels index page's usage) shows the full catalog unbounded.
// Bloc 60 review (Codex PR #81): `active` hides a reference from public
// discovery (homepage teaser + /referentiels index) while its calculator
// row is inactive — every reference shipped active-by-default until Events
// (the first one meant to launch hidden), so this filter was previously
// unneeded; the direct /referentiels/<slug> URL already showed the
// "unavailable" message on its own (see the [slug] page), but this grid
// linked to it anyway.
export type ReferenceSuggestionCard = {
  href: string;
  title: string;
  text: string;
  cta: string;
};

export function ReferenceCatalogGrid({
  t,
  limit,
  locale,
  active,
  descriptions,
  suggestion,
}: {
  t: (key: string) => string;
  limit?: number;
  // Bloc 64/A: tiles ordered by the label actually shown, in the visitor's
  // locale — the catalog's declaration order means nothing to them. Sorted
  // before `limit` applies, so the homepage teaser shows the first N
  // alphabetically rather than the first N declared.
  locale: string;
  active: CalculatorAvailability;
  /**
   * Bloc 129 §3.3 : la description d'une ligne de chaque référentiel, par
   * slug public. Elle vient de `calculators.description` en base (Bloc 130),
   * jamais d'une clé i18n. Une description absente n'affiche pas de ligne
   * vide : le §5 demande de masquer, pas d'inventer.
   */
  descriptions?: Record<string, string>;
  /** La 8e case du §3.3, « Il manque un référentiel ? ». */
  suggestion?: ReferenceSuggestionCard;
}) {
  const available = sortByLabel(
    referenceCatalog.filter((reference) => active[reference.calculatorSlug]),
    (reference) => t(`catalog.${reference.slug}`),
    locale,
  );
  const entries = limit === undefined ? available : available.slice(0, limit);
  return (
    <div className="tool-category-grid">
      {entries.map((reference) => (
        <Link
          className="tool-category-card reference-category-card"
          href={referenceHref(reference.slug)}
          key={reference.slug}
          // Bloc 91/F6: these grids render many cards; the default RSC prefetch
          // fires a request per card on view (~33 on the homepage). The target
          // pages are cheap and one tap away, so skip the speculative fetch.
          prefetch={false}
        >
          <div className="tool-category-image">
            <GameImage
              src={reference.image}
              alt=""
              width={500}
              height={500}
              // Bloc 104: see tool-category-grid.tsx — no placeholder image.
              fallback={null}
            />
          </div>
          <div className="tool-category-copy">
            <h2>{t(`catalog.${reference.slug}`)}</h2>
            {descriptions?.[reference.slug] ? (
              <p className="reference-card-description">
                {descriptions[reference.slug]}
              </p>
            ) : null}
          </div>
        </Link>
      ))}
      {suggestion ? (
        <Link
          className="reference-suggestion-card"
          href={suggestion.href}
          prefetch={false}
        >
          <span className="reference-suggestion-plus" aria-hidden="true">
            +
          </span>
          <span className="reference-suggestion-title">{suggestion.title}</span>
          <span className="reference-suggestion-text">{suggestion.text}</span>
          <span className="reference-suggestion-cta">{suggestion.cta} →</span>
        </Link>
      ) : null}
    </div>
  );
}
