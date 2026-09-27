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
 * thème, menu. La loupe ouvrait le panneau ; le menu ouvrait ce même panneau,
 * dont le champ de recherche est le premier élément. Deux commandes, une
 * seule destination : un doublon fonctionnel, pas seulement visuel. La loupe
 * part, le menu reste.
 *
 * Ouvrir le panneau y place le focus — sur le panneau lui-même, pas sur le
 * champ de recherche. La nuance fait tout : un conteneur n'est pas une zone
 * de saisie, donc aucun clavier logiciel ne se lève, alors qu'ouvrir le menu
 * pour naviguer est le cas le plus courant.
 *
 * Sans ce déplacement, le panneau serait hors d'atteinte au clavier : il
 * précède les boutons dans le DOM (voir plus bas pourquoi), donc une
 * tabulation depuis le bouton menu sautait par-dessus tout ce que
 * l'ouverture venait de révéler, et rejoignait la page. La loupe masquait ce
 * défaut en posant le focus dans le champ ; elle partie, il fallait le
 * corriger. Le focus posé sur le panneau, la tabulation suivante entre
 * dedans, sur le champ de recherche.
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Le focus se pose après le rendu : tant que le panneau est fermé, le CSS
  // mobile le laisse en `display: none`, et un élément non affiché ne prend
  // pas le focus.
  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    requestAnimationFrame(() => panelRef.current?.focus());
  }

  return (
    <header className="public-header" data-open={open}>
      <Link className="brand" href="/">
        <span className="brand-name">{brand}</span>
      </Link>
      {/* `tabIndex={-1}` : le panneau n'entre pas dans l'ordre de tabulation,
          il reçoit seulement le focus que lui donne l'ouverture. L'indicateur
          de focus est celui du Bloc 92, commun à tout `[tabindex]` — visible
          quand on ouvre au clavier, absent quand on ouvre au doigt. */}
      <div
        className="public-header-panel"
        id="public-header-panel"
        ref={panelRef}
        tabIndex={-1}
      >
        {/* Les deux enfants du panneau ferment sur navigation : suivre un
            résultat de recherche mène ailleurs tout autant qu'un lien de
            navigation, et le gabarit public survit à la navigation. */}
        <SiteSearch
          guides={guides}
          active={active}
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
