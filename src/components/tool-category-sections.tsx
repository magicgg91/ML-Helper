import { Link } from "@/i18n/navigation";
import type { getTranslations } from "next-intl/server";
import type { CalculatorAvailability } from "@/lib/calculator-catalog";
import { GameImage } from "./game-image";
import { ToolCountBadge } from "./tool-count-badge";
import { toolCategories, type CategoryToolLink } from "./tool-category-grid";

/**
 * Bloc 132 §6, puis Bloc 133 §A : l'index Outils, une carte par catégorie.
 *
 * Le Bloc 129 y mettait la même grille de quatre cartes que l'accueil, avec
 * la liste des outils glissée dedans : quatre colonnes étroites pour des
 * listes de longueurs très différentes, et les outils — ce qu'on vient
 * chercher — réduits à des lignes de texte. Le Bloc 132 a donné la largeur
 * aux outils en empilant les catégories.
 *
 * Le §A referme ce mouvement : empilées sur toute la largeur, les cartes
 * étaient trop hautes et leurs images trop petites pour ce qu'elles
 * occupaient. Deux colonnes de deux cartes, l'image à 240 px à gauche et
 * les outils en rangées à droite — l'image retrouve une taille lisible, et
 * quatre outils occupent à peu près sa hauteur.
 *
 * Composant distinct de ToolCategoryGrid, qui sert l'accueil : ce sont deux
 * mises en page, pas un composant à deux modes — l'accueil annonce les
 * catégories, l'index ouvre sur les outils.
 *
 * Sur mobile la carte garde son allure : grande image carrée, nom, puis la
 * liste des outils en lignes de 48 px. La description n'y apparaît pas —
 * elle vit sur la page de l'outil, et elle doublerait la hauteur de chaque
 * ligne là où l'écran est le plus étroit.
 */
export function ToolCategorySections({
  active,
  t,
  toolLinks,
  order,
}: {
  active: CalculatorAvailability;
  t: Awaited<ReturnType<typeof getTranslations<"tools">>>;
  /** Les outils actifs de chaque catégorie, déjà traduits et décrits. */
  toolLinks: Record<string, CategoryToolLink[]>;
  /** L'ordre imposé par le §3.2 du Bloc 129 : Villes, Compétences, Combat, Classement. */
  order: readonly string[];
}) {
  const ordered = [...toolCategories].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );
  return (
    <div className="tool-sections">
      {ordered.map((category, index) => {
        const count = category.calculators.filter(
          (slug) => active[slug],
        ).length;
        const links = toolLinks[category.slug] ?? [];
        const available = count > 0;
        const href = `/tools/${category.slug}`;
        const thumb = (
          <span className="tool-section-thumb">
            <GameImage
              src={category.image}
              alt=""
              width={500}
              height={500}
              // La première vignette est l'élément LCP de la page.
              eager={index === 0}
              fallback={null}
            />
          </span>
        );
        const title = (
          <>
            {/* Le nom reste un titre : ces cartes découpent la page sous
                son <h1>, et l'index en tire son plan. */}
            <h2 className="tool-section-name">{t(category.label)}</h2>
            {available ? (
              // Bloc 133 §C : la même pastille que dans le bandeau.
              <ToolCountBadge
                count={count}
                label={t("count-short", { count })}
              />
            ) : (
              <span className="tool-unavailable">{t("comingSoon")}</span>
            )}
          </>
        );
        return (
          <article
            className="tool-section"
            key={category.slug}
            data-disabled={available ? undefined : true}
          >
            {/* Une catégorie sans outil actif n'a pas de page à ouvrir : son
                en-tête reste du texte, pas un lien qui mène à une page vide. */}
            {available ? (
              <>
                {/* L'image mène à la catégorie comme le nom. Elle est retirée
                    de l'arbre d'accessibilité et de l'ordre de tabulation :
                    c'est la même destination que le titre juste à côté, et
                    deux arrêts pour un seul endroit se lisent comme deux
                    choix. Elle reste une grande cible à la souris et au
                    doigt, qui est tout ce qu'on lui demande. */}
                <Link
                  className="tool-section-thumb-link"
                  href={href}
                  prefetch={false}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  {thumb}
                </Link>
                <div className="tool-section-body">
                  <Link
                    className="tool-section-head"
                    href={href}
                    prefetch={false}
                  >
                    {title}
                  </Link>
                  {links.length > 0 && (
                    <ul className="tool-section-tools">
                      {links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} prefetch={false}>
                            <span className="tool-entry-copy">
                              <span className="tool-entry-name">
                                {link.label}
                              </span>
                              {link.description ? (
                                <span className="tool-entry-description">
                                  {link.description}
                                </span>
                              ) : null}
                            </span>
                            <span
                              className="tool-entry-arrow"
                              aria-hidden="true"
                            >
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <>
                {thumb}
                <div className="tool-section-body">
                  <div className="tool-section-head" title={t("unavailable")}>
                    {title}
                  </div>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
