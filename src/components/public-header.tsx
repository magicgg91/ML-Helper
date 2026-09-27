"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { CalculatorAvailability } from "@/lib/calculator-catalog";
import type { SiteSearchGuide } from "@/lib/site-search";
import { LocaleToggle } from "./locale-toggle";
import { PublicNav, type PublicNavLink } from "./public-nav";
import { SiteSearch } from "./site-search";
import { ThemeToggle } from "./theme-toggle";

/**
 * Bloc 132 §1 et §3 : la barre du haut, desktop et mobile.
 *
 * Le Bloc 129 laissait le gabarit assembler la marque, la recherche, la nav,
 * la langue et le thème, chacun indépendant. Sur mobile ça donnait trois
 * lignes — titre et sous-titre, puis les boutons, puis la recherche. La
 * recette demande une seule ligne de 64 px, et qu'ouvrir le panneau place le
 * focus dans le champ de recherche.
 *
 * Bloc 141 : le §3 donnait à la barre mobile quatre boutons — loupe, langue,
 * thème, menu. La loupe ouvrait le panneau en plaçant le focus dans le champ
 * de recherche ; le menu ouvrait ce même panneau, dont le champ de recherche
 * est le premier élément. Deux commandes, une seule destination : un doublon
 * fonctionnel, pas seulement visuel. La loupe part, le menu reste — et il
 * reprend le focus qu'elle posait, pour que la recherche s'atteigne toujours
 * en une action.
 *
 * Le focus à poser dans un champ qui vit ailleurs demande un propriétaire
 * commun : c'est ce composant, et c'est tout ce qu'il fait de plus que le
 * gabarit d'avant.
 *
 * Une seule structure sert les deux tailles d'écran :
 *
 * - `.public-header-panel` est `display: contents` sur desktop, donc la
 *   recherche et la nav retombent dans la rangée comme avant ; sur mobile il
 *   devient le panneau déroulant qui les contient tous les deux ;
 * - l'ordre du DOM — langue, thème, menu — est celui que le §3 demande sur
 *   mobile ; sur desktop le menu est masqué, et il reste nav, langue, thème.
 */
export function PublicHeader({
  brand,
  guides,
  active,
  links,
  labels,
  locales,
}: {
  /** Le nom du site, tel qu'il s'écrit — jamais traduit. */
  brand: string;
  guides: SiteSearchGuide[];
  active: CalculatorAvailability;
  links: PublicNavLink[];
  labels: { nav: string; menu: string };
  locales: string[];
}) {
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bloc 141 : ouvrir le panneau, c'est le plus souvent ouvrir pour
  // chercher — le champ en est le premier élément. Le focus suit donc
  // l'ouverture, comme il suivait la loupe avant qu'elle ne disparaisse.
  //
  // Il se pose après le rendu : tant que le panneau est fermé, le CSS mobile
  // le laisse en `display: none`, et un élément non affiché ne prend pas le
  // focus.
  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  return (
    <header className="public-header" data-open={open}>
      <Link className="brand" href="/">
        <span className="brand-name">{brand}</span>
      </Link>
      <div className="public-header-panel" id="public-header-panel">
        {/* Les deux enfants du panneau ferment sur navigation : suivre un
            résultat de recherche mène ailleurs tout autant qu'un lien de
            navigation, et le gabarit public survit à la navigation. */}
        <SiteSearch
          guides={guides}
          active={active}
          inputRef={searchInputRef}
          onNavigate={() => setOpen(false)}
        />
        <PublicNav
          links={links}
          navLabel={labels.nav}
          onNavigate={() => setOpen(false)}
        />
      </div>
      <div className="public-header-actions">
        <LocaleToggle locales={locales} />
        <ThemeToggle />
        <button
          type="button"
          className="public-header-icon public-header-menu"
          aria-label={labels.menu}
          aria-expanded={open}
          aria-controls="public-header-panel"
          onClick={toggle}
        >
          {open ? (
            <XIcon aria-hidden="true" size={18} />
          ) : (
            <MenuIcon aria-hidden="true" size={18} />
          )}
        </button>
      </div>
    </header>
  );
}
