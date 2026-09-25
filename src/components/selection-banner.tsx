import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { GameImage } from "./game-image";
import { TabLabel } from "./tab-label";

/**
 * Bloc 132 §8 : le bandeau de sélection, commun aux catégories d'outils et
 * aux référentiels.
 *
 * Les deux rangées faisaient la même chose — choisir dans quelle section on
 * se trouve — avec deux mises en forme écrites séparément : celle des outils
 * dans une carte, celle des référentiels sans, des rayons et des espacements
 * proches mais jamais égaux. Le §8 les ramène à une seule forme, donc à un
 * seul composant : deux copies d'une même intention divergent à la première
 * retouche, et c'est exactement ce qui s'était produit.
 *
 * Ce que le composant ne fait pas : décider de la nature d'une entrée non
 * cliquable. Les deux bandeaux ne désignent pas la même chose — côté Outils,
 * une catégorie sans outil actif garde une page (d'où un bouton désactivé,
 * qui peut porter `aria-current`) ; côté Référentiels, une entrée pas encore
 * ouverte n'a pas de page du tout. Le §8 unifie leur apparence, pas leur
 * nature, et c'est l'appelant qui tranche.
 */
export function SelectionBanner({
  navLabel,
  columns,
  children,
}: {
  navLabel: string;
  /** Les colonnes de la rangée sur desktop : 4 catégories, 7 référentiels. */
  columns: number;
  children: ReactNode;
}) {
  return (
    <div className="selection-banner">
      <nav
        className="selection-banner-band"
        aria-label={navLabel}
        style={{ "--selection-columns": columns } as CSSProperties}
      >
        {children}
      </nav>
    </div>
  );
}

type SelectionTabBase = {
  /** L'illustration de la section, carrée et purement décorative. */
  image: string;
  label: string;
  current?: boolean;
  /**
   * Ce que l'appelant ajoute après le libellé — le nombre d'outils, côté
   * Outils.
   */
  children?: ReactNode;
  /**
   * La mention d'une entrée pas encore ouverte, sous le libellé. Toujours
   * affichée, jamais seulement au survol : sur tactile, une infobulle ne
   * s'affiche jamais (Bloc 62/J).
   */
  badge?: string;
};

export type SelectionTabProps = SelectionTabBase &
  (
    | { href: string; element?: undefined; title?: undefined }
    | {
        href?: undefined;
        /** L'élément à rendre quand l'entrée n'est pas un lien. */
        element: "button" | "span";
        /** L'infobulle qui dit pourquoi elle ne l'est pas. */
        title: string;
      }
  );

/** Un onglet du bandeau : vignette carrée, libellé, et ce que l'appelant ajoute. */
export function SelectionTab({
  image,
  label,
  current,
  badge,
  children,
  ...rest
}: SelectionTabProps) {
  const content = (
    <>
      <span className="selection-tab-thumb">
        <GameImage
          src={image}
          alt=""
          width={120}
          height={120}
          fallback={null}
        />
      </span>
      <span className="selection-tab-label">
        {/* Le même repère que sur les onglets d'un outil : l'astérisque
            ambré de TabLabel, la seule façon dont ce site dit « pas
            encore ». */}
        <TabLabel label={label} badge={badge} />
      </span>
      {children}
    </>
  );
  const ariaCurrent = current ? ("page" as const) : undefined;

  if (rest.href !== undefined)
    return (
      <Link
        className="selection-tab"
        href={rest.href}
        aria-current={ariaCurrent}
      >
        {content}
      </Link>
    );

  // Le bouton désactivé garde `aria-current` : une catégorie sans outil actif
  // a bien une page, et cet onglet est le seul repère visible qui dit qu'on y
  // est (le <h1> de la page est réservé aux lecteurs d'écran).
  if (rest.element === "button")
    return (
      <button
        className="selection-tab"
        type="button"
        disabled
        aria-current={ariaCurrent}
        title={rest.title}
      >
        {content}
      </button>
    );

  return (
    <span
      className="selection-tab"
      aria-disabled="true"
      aria-current={ariaCurrent}
      title={rest.title}
    >
      {content}
    </span>
  );
}
