"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { GameImage } from "./game-image";
import { MarkdownRenderer } from "./markdown-renderer";
import { localizedText } from "../lib/translations";
import type { EditorialLocale } from "./editorial-locale-select";
import {
  consumableCategories,
  type ConsumableCategory,
  type ConsumableRow,
} from "../lib/consumables";

// Bloc 44 review: item name/description are flat fr/en-suffixed fields
// (never omitted, only ever "" when blank), so localizedText()'s
// missing-key fallback doesn't apply here — an explicit "" must still be
// treated as absent. fr gets its own preference only for the fr locale
// itself; every other locale (en included, and de/es/tr with no
// item-level translation of their own) prefers en — the universal safety
// net (Bloc 47/D review) — falling back to fr only if en is blank.
function pickLocaleText(fr: string, en: string, locale: string): string {
  return locale === "fr" ? fr || en : en || fr;
}

// Bloc 46/C: mirrors reference-tables.tsx's Filters component (aria-pressed,
// data-testid, cumulative multi-select), but for Consommables' single
// category dimension only — no family/rarity here.
function CategoryFilters({
  selected,
  toggle,
  categoryLabel,
  filtersLabel,
  filterLabel,
}: {
  selected: Set<ConsumableCategory>;
  toggle: (category: ConsumableCategory) => void;
  categoryLabel: (category: ConsumableCategory) => string;
  filtersLabel: string;
  filterLabel: string;
}) {
  return (
    <div className="reference-filters" aria-label={filtersLabel}>
      <div>
        <span className="filter-label">{filterLabel}</span>
        <div className="family-buttons">
          {consumableCategories.map((category) => (
            <button
              type="button"
              key={category}
              aria-pressed={selected.has(category)}
              data-testid={`filter-category-${category}`}
              onClick={() => toggle(category)}
            >
              {categoryLabel(category)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bloc 43: the only reference with 2 public zones — a free-text markdown
// block (filled in by the porteur de projet via admin) above the items
// table. Costs are shown at raw value, never compacted to k/M (cdc section
// 3.3 exception, same rule already applied to Gemmes' prices).
export function ConsumablesReferenceTable({
  intro,
  rows,
}: {
  intro: Record<EditorialLocale, string>;
  rows: ConsumableRow[];
}) {
  const t = useTranslations("references.consommables");
  const categoryLabel = useTranslations("references.consommables.categories");
  const locale = useLocale();
  const introText = localizedText(intro, locale);
  const [selectedCategories, setSelectedCategories] = useState<
    Set<ConsumableCategory>
  >(() => new Set(consumableCategories));

  function toggleCategory(category: ConsumableCategory) {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const visibleRows = rows.filter((row) =>
    selectedCategories.has(row.category),
  );

  return (
    <div className="calculator-stack">
      {introText && <MarkdownRenderer markdown={introText} />}
      <CategoryFilters
        selected={selectedCategories}
        toggle={toggleCategory}
        categoryLabel={categoryLabel}
        filtersLabel={t("filters.label")}
        filterLabel={t("filters.category")}
      />
      <section className="calculator-card ranking-table-wrap">
        <div className="table-scroll">
          <table className="ranking-table reference-table reference-simple-table consumables-table">
            <thead>
              <tr>
                <th>{t("columns.image")}</th>
                <th>{t("columns.name")}</th>
                <th>{t("columns.description")}</th>
                <th>{t("columns.cost")}</th>
                <th>{t("columns.category")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const name = pickLocaleText(row.name_fr, row.name_en, locale);
                const description = pickLocaleText(
                  row.description_fr,
                  row.description_en,
                  locale,
                );
                return (
                  <tr key={`${row.image}-${index}`}>
                    <td>
                      <GameImage
                        src={row.image}
                        alt={name}
                        className="reference-equipment-image"
                        fallback={null}
                      />
                    </td>
                    <td>{name}</td>
                    <td>{description}</td>
                    <td className="value">{row.cost || t("cost-unknown")}</td>
                    <td>{categoryLabel(row.category)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
