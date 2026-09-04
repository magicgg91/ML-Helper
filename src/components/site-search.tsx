"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CalculatorAvailability } from "@/lib/calculator-catalog";
import {
  buildSiteSearchResults,
  type SiteSearchGuide,
} from "@/lib/site-search";

export function SiteSearch({
  guides,
  active,
}: {
  guides: SiteSearchGuide[];
  active?: Partial<CalculatorAvailability>;
}) {
  const locale = useLocale();
  const t = useTranslations("search");
  const translate = useTranslations();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="site-search" ref={containerRef}>
      <label className="site-search-label">
        <span className="sr-only">{t("label")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("placeholder")}
        />
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
