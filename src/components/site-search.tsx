"use client";

import { SearchIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CalculatorAvailability } from "@/lib/calculator-catalog";
import {
  buildSiteSearchResults,
  type SiteSearchGuide,
} from "@/lib/site-search";

export function SiteSearch({
  guides,
  active,
  inputRef: externalInputRef,
  onNavigate,
}: {
  guides: SiteSearchGuide[];
  active?: Partial<CalculatorAvailability>;
  /**
   * Bloc 132 §3 : sur mobile, le bouton loupe de l'en-tête ouvre le panneau
   * puis place le focus ici. Le champ vit dans ce composant, la commande
   * ailleurs — d'où la référence prêtée par l'appelant.
   */
  inputRef?: RefObject<HTMLInputElement | null>;
  /**
   * Bloc 132, retour de revue : suivre un résultat ferme la liste locale,
   * mais pas ce qui contient ce champ. Sur mobile c'est le panneau de
   * l'en-tête, et le gabarit public survit à la navigation : la page
   * d'arrivée s'affichait sous un panneau resté ouvert.
   */
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("search");
  const translate = useTranslations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? ownInputRef;

  const results = useMemo(
    () =>
      buildSiteSearchResults({
        query,
        locale,
        guides,
        translate: (key) => translate(key),
        active,
      }),
    [query, locale, guides, translate, active],
  );

  const trimmed = query.trim();

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Bloc 129 §2.1 : « / » place le focus dans la recherche — sauf si on est
  // déjà en train de saisir quelque chose. Sans cette réserve, le raccourci
  // volerait la touche à qui écrit une barre oblique dans le formulaire de
  // contact ou dans un champ d'un outil. Un champ en lecture seule ou
  // désactivé ne saisit rien, donc il ne retient pas la touche.
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      const editable =
        target?.isContentEditable ||
        (target instanceof HTMLInputElement && !target.readOnly) ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (editable) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
    // `inputRef` peut être celle de l'appelant (Bloc 132 §3) : sa référence
    // entre dans les dépendances pour que l'écouteur suive un changement de
    // propriétaire, même si en pratique elle est stable.
  }, [inputRef]);

  return (
    <div className="site-search" ref={containerRef}>
      <label className="site-search-label">
        <span className="sr-only">{t("label")}</span>
        <SearchIcon className="site-search-icon" aria-hidden="true" size={18} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("placeholder")}
        />
        {/* L'indication du raccourci est décorative : elle rappelle la touche
            à qui la voit, et le champ est déjà nommé par son <span sr-only>.
            Annoncée, elle ferait lire « barre oblique » au milieu du nom. */}
        <kbd className="site-search-shortcut" aria-hidden="true">
          /
        </kbd>
      </label>
      {open && trimmed ? (
        results.length ? (
          <ul className="site-search-results" aria-label={t("results-label")}>
            {results.map((result) => (
              <li key={result.id}>
                <Link
                  href={result.href}
                  onClick={() => {
                    setQuery("");
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span className="site-search-result-type">
                    {t(`types.${result.type}`)}
                  </span>
                  <span className="site-search-result-label">
                    {result.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="site-search-empty" role="status">
            {t("no-results")}
          </p>
        )
      ) : null}
    </div>
  );
}
