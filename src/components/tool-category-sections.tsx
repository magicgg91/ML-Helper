import { Link } from "@/i18n/navigation";
import type { getTranslations } from "next-intl/server";
import type { CalculatorAvailability } from "@/lib/calculator-catalog";
import { GameImage } from "./game-image";
import {
  toolCategories,
  type CategoryToolLink,
} from "./tool-category-grid";

/**
 * Bloc 132 §6 : l'index Outils, en cartes empilées.
 *
 * Le Bloc 129 y mettait la même grille de quatre cartes que l'accueil, avec
 * la liste des outils glissée dedans : sur desktop, quatre colonnes étroites
 * pour des listes de longueurs très différentes, et les outils — ce qu'on
 * vient chercher — réduits à des lignes de texte. Une carte par catégorie,
 * l'une sous l'autre, laisse la largeur aux outils, qui deviennent des tuiles
 * cliquables portant leur description.
 *
 * Composant distinct de ToolCategoryGrid, qui sert l'accueil : ce sont deux
 * mises en page, pas un composant à deux modes — l'accueil annonce les
 * catégories, l'index ouvre sur les outils.
 *
 * Sur mobile la carte reprend l'allure d'avant : grande image carrée, nom,
 * puis la liste des outils en lignes de 48 px. La description n'y apparaît
 * pas — elle vit sur la page de l'outil, et elle doublerait la hauteur de
 * chaque ligne là où l'écran est le plus étroit.
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
        const head = (
          <>
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
            {/* Le nom reste un titre : ces cartes découpent la page sous
                son <h1>, et l'index en tire son plan. */}
            <h2 className="tool-section-name">{t(category.label)}</h2>
            {available ? (
              <span className="tool-count">{t("count", { count })}</span>
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
              <Link
                className="tool-section-head"
                href={`/tools/${category.slug}`}
                prefetch={false}
              >
                {head}
              </Link>
            ) : (
              <div className="tool-section-head" title={t("unavailable")}>
                {head}
              </div>
            )}
            {links.length > 0 && (
              <ul className="tool-section-tools">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} prefetch={false}>
                      <span className="tool-entry-copy">
                        <span className="tool-entry-name">{link.label}</span>
                        {link.description ? (
                          <span className="tool-entry-description">
                            {link.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="tool-entry-arrow" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
