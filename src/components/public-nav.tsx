"use client";

import { Link, usePathname } from "@/i18n/navigation";

/**
 * Bloc 132 §1 : les quatre entrées portent la même forme. Contact n'est plus
 * « un cran en retrait » (Bloc 129 §2.1) : la maquette de recette range les
 * quatre boutons sur un pied d'égalité, et le `subdued` qui les distinguait
 * n'a plus de rendu — il disparaît plutôt que de rester sans effet.
 */
export type PublicNavLink = {
  href: string;
  label: string;
};

/**
 * Les entrées de navigation, et rien d'autre.
 *
 * Bloc 132 §3 : le bouton ☰ vivait ici et ouvrait cette nav. Sur mobile, la
 * nav partage maintenant un panneau avec le champ de recherche, et c'est le
 * bouton menu de l'en-tête qui l'ouvre — seul depuis le Bloc 141, qui a
 * retiré la loupe menant au même panneau. L'état a donc remonté dans
 * PublicHeader ; ce composant ne décide plus de son ouverture, il la
 * reçoit.
 */
export function PublicNav({
  links,
  navLabel,
  onNavigate,
}: {
  links: PublicNavLink[];
  navLabel: string;
  /** Referme le panneau mobile quand on part sur une page. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="public-header-nav" aria-label={navLabel}>
      {links.map((link) => {
        const isActive =
          pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
