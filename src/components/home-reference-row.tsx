import { Link } from "@/i18n/navigation";
import { GameImage } from "./game-image";

/**
 * Bloc 129 §3.3 : les sept référentiels de l'accueil, sur une seule rangée.
 *
 * Volontairement distinct de ReferenceCatalogGrid, qui sert l'index
 * /referentiels : là-bas une carte porte aussi une description (§3.3), ici
 * c'est une vignette carrée et un nom. Deux mises en page, deux composants —
 * plutôt qu'un composant à deux modes.
 */
export type ReferenceRowEntry = {
  href: string;
  label: string;
  image: string;
};

export function HomeReferenceRow({
  entries,
}: {
  entries: ReferenceRowEntry[];
}) {
  return (
    <ul className="home-reference-row">
      {entries.map((entry) => (
        <li key={entry.href}>
          <Link href={entry.href} prefetch={false}>
            <span className="home-reference-image">
              <GameImage
                src={entry.image}
                alt=""
                width={300}
                height={300}
                fallback={null}
              />
            </span>
            <span className="home-reference-label">{entry.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
