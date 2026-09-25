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
  actions,
  counters,
  panelTitle,
  entries,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  /**
   * Bloc 132 §5 : trois actions au lieu de deux — « Explorer les outils »,
   * « Consulter les référentiels », « Bien débuter ». La première est
   * principale, les suivantes secondaires ; la liste est ouverte plutôt que
   * nommée une par une, parce que la dernière disparaît tant qu'aucun guide
   * n'est désigné comme point de départ.
   */
  actions: HeroLink[];
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
          {actions.map((action, index) => (
            <Button
              key={action.href}
              variant={index === 0 ? "primary" : "secondary"}
              href={action.href}
            >
              {action.label}
            </Button>
          ))}
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
        <aside className="home-hero-panel" aria-labelledby="home-highlights">
          <h2 id="home-highlights">{panelTitle}</h2>
          <ul>
            {entries.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} prefetch={false}>
                  {/* Bloc 132 §4 : un guide sans illustration de couverture
                      garde son emplacement — la vignette vide aligne les
                      libellés — mais pas d'<img> sans source pour autant. */}
                  <span className="home-hero-thumb">
                    {entry.image ? (
                      <GameImage
                        src={entry.image}
                        alt=""
                        width={80}
                        height={80}
                        fallback={null}
                      />
                    ) : null}
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
