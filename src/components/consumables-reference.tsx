"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { GameImage } from "./game-image";
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
              below, both driven by the same constant. Intro is never a
              filter option (Bloc 58/A: it's not part of this list). */}
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

// Bloc 58/A: shared by the intro table (3 columns, no Coût) and the 4
// category tables (4 columns) — same row shape/rendering either way, only
// whether the cost column exists differs.
// Bloc 58/B: the Image column header is intentionally blank — the image
// itself still renders normally in the column, only its heading text is
// dropped.
function ReferenceTable({
  title,
  rows,
  t,
  locale,
  showCost,
}: {
  title: string;
  rows: ConsumableRow[];
  t: (key: string) => string;
  locale: string;
  showCost: boolean;
}) {
  return (
    <section className="calculator-card ranking-table-wrap">
      <h2 className="editable-reference-title">{title}</h2>
      <div className="table-scroll">
        <table className="ranking-table reference-table reference-simple-table consumables-table">
          <thead>
            <tr>
              <th></th>
              <th>{t("columns.name")}</th>
              <th>{t("columns.description")}</th>
              {showCost && <th>{t("columns.cost")}</th>}
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
                  {showCost && (
                    <td className="value">{row.cost || t("cost-unknown")}</td>
                  )}
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
// Bloc 58/A: the free-text markdown intro zone is replaced by a structured
// "Intro" table — same component as the category tables (minus Coût),
// always rendered first and never affected by the category filters below.
export function ConsumablesReferenceTable({
  catalog,
}: {
  catalog: ConsumableCatalog;
}) {
  const t = useTranslations("references.consommables");
  const categoryLabel = useTranslations("references.consommables.categories");
  const locale = useLocale();
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
      <ReferenceTable
        title={t("introTitle")}
        rows={catalog.intro}
        t={t}
        locale={locale}
        showCost={false}
      />
      {/* Bloc 52/C: wrapped in the same .calculator-card frame the other
          references' Filters block uses (see reference-tables.tsx) — was
          rendering .reference-filters bare, the only reference filter bar
          without it. */}
      <section className="calculator-card">
        <CategoryFilters
          selected={selectedCategories}
          toggle={toggleCategory}
          categoryLabel={categoryLabel}
          filtersLabel={t("filters.label")}
          filterLabel={t("filters.category")}
        />
      </section>
      {/* Bloc 48/D: table order follows consumableCategories (alphabetical:
          Conseillers, Équipement, Expédition, Inventaire), same order as
          the filter buttons above. */}
      {consumableCategories
        .filter((category) => selectedCategories.has(category))
        .map((category) => (
          <ReferenceTable
            key={category}
            title={categoryLabel(category)}
            rows={catalog[category]}
            t={t}
            locale={locale}
            showCost
          />
        ))}
    </div>
  );
}
