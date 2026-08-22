"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  buildSiteSearchResults,
  type SiteSearchGuide,
} from "@/lib/site-search";

export function SiteSearch({ guides }: { guides: SiteSearchGuide[] }) {
  const locale = useLocale();
  const t = useTranslations("search");
  const translate = useTranslations();
  const [query, setQuery] = useState("");

  const results = useMemo(
    () =>
      buildSiteSearchResults({
        query,
        locale,
        guides,
        translate: (key) => translate(key),
      }),
    [query, locale, guides, translate],
  );

  const trimmed = query.trim();

  return (
    <div className="site-search">
      <label className="site-search-label">
        <span className="sr-only">{t("label")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("placeholder")}
        />
      </label>
      {trimmed ? (
        results.length ? (
          <ul className="site-search-results" aria-label={t("results-label")}>
            {results.map((result) => (
              <li key={result.id}>
                <Link href={result.href} onClick={() => setQuery("")}>
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
