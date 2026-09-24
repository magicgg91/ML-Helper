import { Link } from "@/i18n/navigation";
import { GameImage } from "./game-image";

/**
 * Bloc 129 §3.1, section Apprendre : la carte « Commence ici » à gauche, les
 * autres guides en liste à droite.
 *
 * La carte garde ses couleurs propres dans les deux thèmes — c'est la seule
 * exception que le §1.2 s'autorise, et elle est portée par les jetons
 * --start-here-* plutôt que par des couleurs écrites dans le balisage.
 *
 * S'il n'y a pas de guide mis en avant, la liste occupe toute la largeur : on
 * ne rend pas une carte vide.
 */
export type GuideEntry = {
  href: string;
  title: string;
  excerpt: string;
  /** L'illustration du guide, ou rien — l'emplacement vide prend le relais. */
  image: string | null;
};

export type FeaturedGuide = GuideEntry & { badge: string; cta: string };

export function HomeGuides({
  featured,
  others,
  placeholderLabel,
}: {
  featured?: FeaturedGuide;
  others: GuideEntry[];
  /** Le mot posé sur un emplacement d'image vide (§1.3). */
  placeholderLabel: string;
}) {
  const media = (image: string | null, className: string) => (
    <span className={className}>
      {image ? (
        <GameImage
          src={image}
          alt=""
          width={600}
          height={600}
          fallback={null}
        />
      ) : (
        <span className="image-placeholder">{placeholderLabel}</span>
      )}
    </span>
  );
  return (
    <div className="home-learn" data-featured={featured ? "yes" : "no"}>
      {featured ? (
        <Link className="start-here-card" href={featured.href} prefetch={false}>
          {media(featured.image, "start-here-media")}
          <span className="start-here-copy">
            <span className="start-here-badge">{featured.badge}</span>
            <span className="start-here-title">{featured.title}</span>
            <span className="start-here-excerpt">{featured.excerpt}</span>
            <span className="start-here-cta">{featured.cta} →</span>
          </span>
        </Link>
      ) : null}
      {others.length > 0 ? (
        <ul className="home-guide-list">
          {others.map((guide) => (
            <li key={guide.href}>
              <Link href={guide.href} prefetch={false}>
                {media(guide.image, "home-guide-thumb")}
                <span className="home-guide-copy">
                  <span className="home-guide-title">{guide.title}</span>
                  <span className="home-guide-excerpt">{guide.excerpt}</span>
                </span>
                <span className="home-guide-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
