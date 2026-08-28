import Link from "next/link";
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
export function ReferenceCatalogGrid({
  t,
}: {
  t: (key: string) => string;
}) {
  return (
    <div className="tool-category-grid">
      {referenceCatalog.map((reference) => (
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
