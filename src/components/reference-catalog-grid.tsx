import Link from "next/link";
import type { CalculatorAvailability } from "../lib/calculator-catalog";
import { referenceCatalog, referenceHref } from "../lib/reference-catalog";
import { GameImage } from "./game-image";

// Bloc 38/O: shared between the homepage and /guides (previously duplicated
// markup in each) — same GameImage + fallback-icon treatment as
// ToolCategoryGrid's tool categories, including the aspect-ratio: 1 image
// box (Bloc 38/H) via the shared .tool-category-image class.
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
export function ReferenceCatalogGrid({
  t,
  limit,
  active,
}: {
  t: (key: string) => string;
  limit?: number;
  active: CalculatorAvailability;
}) {
  const available = referenceCatalog.filter(
    (reference) => active[reference.calculatorSlug],
  );
  const entries =
    limit === undefined ? available : available.slice(0, limit);
  return (
    <div className="tool-category-grid">
      {entries.map((reference) => (
        <Link
          className="tool-category-card reference-category-card"
          href={referenceHref(reference.slug)}
          key={reference.slug}
        >
          <div className="tool-category-image">
            <GameImage
              src={reference.image}
              alt=""
              fallback={
                // eslint-disable-next-line @next/next/no-img-element -- static bundled placeholder icon, no next/image benefit for a tiny SVG.
                <img src={reference.fallbackImage} alt="" />
              }
            />
          </div>
          <div className="tool-category-copy">
            <h3>{t(`catalog.${reference.slug}`)}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
