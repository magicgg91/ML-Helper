import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Bloc 132 §2 : le bouton du site public, en trois variantes.
 *
 * Avant ce bloc, chaque endroit dessinait le sien : pilule pour le hero,
 * pilule bordée pour « Signaler une erreur », pilule encore pour les objets
 * de Contact. La recette demande une seule forme — rectangle à coins
 * arrondis de 10 px — et trois rôles :
 *
 * - `primary` : l'action principale d'un écran (fond accent plein) ;
 * - `secondary` : tout le reste, dessiné comme une entrée inactive de
 *   l'en-tête (fond de champ, contour fort, texte secondaire) ;
 * - `toggle` : un choix dans un groupe, qui s'allume comme une entrée
 *   active de l'en-tête quand `aria-pressed` vaut « true ».
 *
 * Le champ de recherche garde sa pilule et n'emprunte rien d'ici : c'est un
 * point ouvert que le prompt met explicitement hors périmètre.
 *
 * Deux formes de rendu pour un seul style : avec `href` c'est un lien de
 * navigation, sans c'est un vrai `<button>`. Le style ne dépend pas de la
 * balise, mais l'accessibilité si — un lien qui navigue ne doit pas se faire
 * passer pour un bouton.
 */
export type ButtonVariant = "primary" | "secondary" | "toggle";

/** La classe CSS d'une variante, pour le rare appelant qui pose son propre balisage. */
export function buttonClassName(variant: ButtonVariant, className?: string) {
  return `button-${variant}${className ? ` ${className}` : ""}`;
}

type Shared = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

type AsLink = Shared & {
  href: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

type AsButton = Shared & {
  href?: undefined;
} & Omit<ComponentProps<"button">, "className" | "children">;

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: AsLink | AsButton) {
  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest;
    return (
      <Link
        className={buttonClassName(variant, className)}
        href={href}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      // Sans type explicite, un bouton dans un formulaire le soumet — ce que
      // ni une pastille d'objet ni un bouton de navigation ne veulent. Un
      // appelant qui soumet vraiment passe son propre `type`, après ce
      // défaut.
      type="button"
      className={buttonClassName(variant, className)}
      // `rest` porte encore un `href?: undefined` de la branche lien, que
      // TypeScript refuse sur un <button>. Il n'existe pas à l'exécution :
      // cette branche n'est atteinte que lorsque `href` est absent.
      {...(rest as ComponentProps<"button">)}
    >
      {children}
    </button>
  );
}
