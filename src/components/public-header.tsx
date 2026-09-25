"use client";

import { MenuIcon, SearchIcon, XIcon } from "lucide-react";
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
 * recette demande une seule ligne de 64 px, et que la loupe ouvre le panneau
 * en plaçant le focus dans le champ.
 *
 * Deux commandes qui ouvrent le même panneau et un focus à poser dans un
 * champ qui vit ailleurs : il fallait un propriétaire commun. C'est ce
 * composant, et c'est tout ce qu'il fait de plus que le gabarit d'avant.
 *
 * Une seule structure sert les deux tailles d'écran :
 *
 * - `.public-header-panel` est `display: contents` sur desktop, donc la
 *   recherche et la nav retombent dans la rangée comme avant ; sur mobile il
 *   devient le panneau déroulant qui les contient tous les deux ;
 * - l'ordre du DOM — loupe, langue, thème, menu — est celui que le §3
 *   demande sur mobile ; sur desktop la loupe et le menu sont masqués, et
 *   il reste nav, langue, thème.
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
  labels: { nav: string; menu: string; search: string };
  locales: string[];
}) {
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ouvrir depuis la loupe, c'est ouvrir pour écrire : le focus suit. Le
  // champ n'existe dans le DOM mobile qu'une fois le panneau ouvert, donc le
  // focus se pose après le rendu.
  function openSearch() {
    setOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  return (
    <header className="public-header" data-open={open}>
      <Link className="brand" href="/">
        <span className="brand-name">{brand}</span>
      </Link>
      <div className="public-header-panel" id="public-header-panel">
        <SiteSearch guides={guides} active={active} inputRef={searchInputRef} />
        <PublicNav
          links={links}
          navLabel={labels.nav}
          onNavigate={() => setOpen(false)}
        />
      </div>
      <div className="public-header-actions">
        <button
          type="button"
          className="public-header-icon public-header-search"
          aria-label={labels.search}
          aria-expanded={open}
          aria-controls="public-header-panel"
          onClick={() => (open ? setOpen(false) : openSearch())}
        >
          <SearchIcon aria-hidden="true" size={18} />
        </button>
        <LocaleToggle locales={locales} />
        <ThemeToggle />
        <button
          type="button"
          className="public-header-icon public-header-menu"
          aria-label={labels.menu}
          aria-expanded={open}
          aria-controls="public-header-panel"
          onClick={() => setOpen((value) => !value)}
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
