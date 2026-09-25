import { Link } from "@/i18n/navigation";
import { Button } from "./button";
import { GameImage } from "./game-image";

/**
 * Bloc 129 §3.1 : le hero de l'accueil — ce que fait le site à gauche, les
 * cinq entrées les plus utilisées à droite.
 *
 * Le composant ne va rien chercher : la page lui passe des libellés déjà
 * traduits et des compteurs déjà calculés. C'est ce qui permet de tester la
 * mise en page sans base de données, et de garder le calcul des compteurs
 * (qui, lui, dépend de ce qui est activé) au seul endroit qui le sait.
 */
export type HeroLink = { href: string; label: string };

export type HeroEntry = {
  href: string;
  label: string;
  /** « Outil · Villes » ou « Référentiel ». */
  type: string;
  image: string;
};

export function HomeHero({
  eyebrow,
  title,
  intro,
  primary,
  secondary,
  counters,
  panelTitle,
  entries,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  primary: HeroLink;
  /** Absent tant qu'aucun guide n'est désigné comme point de départ. */
  secondary?: HeroLink;
  /** « 11 outils », « 7 référentiels », « 5 guides » — déjà accordés. */
  counters: string[];
  panelTitle: string;
  entries: HeroEntry[];
}) {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="home-hero-intro">{intro}</p>
        <div className="home-hero-actions">
          <Button href={primary.href}>{primary.label}</Button>
          {secondary ? (
            <Button variant="secondary" href={secondary.href}>
              {secondary.label}
            </Button>
          ) : null}
        </div>
        {/* Les séparateurs sont de la ponctuation entre trois nombres, pas
            du texte à annoncer : la liste porte le sens, eux la mise en
            page. */}
        <ul className="home-hero-counters">
          {counters.map((counter) => (
            <li key={counter}>{counter}</li>
          ))}
        </ul>
      </div>
      {entries.length > 0 ? (
        <aside className="home-hero-panel" aria-labelledby="home-most-used">
          <h2 id="home-most-used">{panelTitle}</h2>
          <ul>
            {entries.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} prefetch={false}>
                  <span className="home-hero-thumb">
                    <GameImage
                      src={entry.image}
                      alt=""
                      width={80}
                      height={80}
                      fallback={null}
                    />
                  </span>
                  <span className="home-hero-entry-copy">
                    <span className="home-hero-entry-label">{entry.label}</span>
                    <span className="home-hero-entry-type">{entry.type}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
