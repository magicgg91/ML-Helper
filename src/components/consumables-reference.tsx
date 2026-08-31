"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { GameImage } from "./game-image";
import { MarkdownRenderer } from "./markdown-renderer";
import { localizedText } from "../lib/translations";
import type { EditorialLocale } from "./editorial-locale-select";
import {
  consumableCategories,
  type ConsumableCatalog,
  type ConsumableCategory,
  type ConsumableRow,
} from "../lib/consumables";

function pickLocaleText(fr: string, en: string, locale: string): string {
  return locale === "fr" ? fr || en : en || fr;
}

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
          {/* Bloc 48/D: category button order follows consumableCategories
              (alphabetical: Conseillers, Équipement, Expédition,
              Inventaire) — kept in sync with the table display order
              below, both driven by the same constant. */}
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

function CategoryTable({
  category,
  rows,
  categoryLabel,
  t,
  locale,
}: {
  category: ConsumableCategory;
  rows: ConsumableRow[];
  categoryLabel: (category: ConsumableCategory) => string;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <section className="calculator-card ranking-table-wrap">
      <h2 className="editable-reference-title">{categoryLabel(category)}</h2>
      <div className="table-scroll">
        <table className="ranking-table reference-table reference-simple-table consumables-table">
          <thead>
            <tr>
              <th>{t("columns.image")}</th>
              <th>{t("columns.name")}</th>
              <th>{t("columns.description")}</th>
              <th>{t("columns.cost")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Bloc 48/B: replaces the single filtered table (with a "Type" column) by
// 4 fully independent tables, one per category — category is no longer a
// column, it's which table a row lives in. A deselected filter button
// fully removes its table from the DOM (Bloc41's full-hide pattern, not a
// dim/opacity treatment).
export function ConsumablesReferenceTable({
  intro,
  catalog,
}: {
  intro: Record<EditorialLocale, string>;
  catalog: ConsumableCatalog;
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
      {/* Bloc 48/D: table order follows consumableCategories (alphabetical:
          Conseillers, Équipement, Expédition, Inventaire), same order as
          the filter buttons above. */}
      {consumableCategories
        .filter((category) => selectedCategories.has(category))
        .map((category) => (
          <CategoryTable
            key={category}
            category={category}
            rows={catalog[category]}
            categoryLabel={categoryLabel}
            t={t}
            locale={locale}
          />
        ))}
    </div>
  );
}
