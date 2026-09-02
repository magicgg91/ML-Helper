"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { renderBoldText } from "./bold-text";
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

// Bloc 64/C: the 4 category tables became tile grids on the public page —
// 2 tiles per row on desktop, 1 on mobile, each tile pairing the image
// with the name and description, and carrying the sapphire cost as a badge
// in its top-right corner, aligned with the name.
// Bloc 65/A: the Intro block (Bloc 58/A) joins them, same structure and
// same colors — only without the cost badge, since its entries (Saphirs,
// Inventaire) explain a currency rather than being priced items. The admin
// editor keeps its tables either way.
function ReferenceTileGrid({
  title,
  rows,
  t,
  costWithUnit,
  locale,
}: {
  title: string;
  rows: ConsumableRow[];
  t: (key: string) => string;
  // Bloc 64/C review: the badge replaced the "Coût (Saphirs)" column
  // header, which was the only thing naming the currency — so the unit
  // rides along with the number now, for everyone rather than being
  // implied by the badge's color.
  // Bloc 65/A: left out entirely by the Intro grid, whose rows carry no
  // cost to show.
  costWithUnit?: (cost: number) => string;
  locale: string;
}) {
  return (
    <section className="calculator-card">
      <h2 className="editable-reference-title">{title}</h2>
      <div className="consumable-tile-grid">
        {rows.map((row, index) => {
          const name = pickLocaleText(row.name_fr, row.name_en, locale);
          const description = pickLocaleText(
            row.description_fr,
            row.description_en,
            locale,
          );
          return (
            <article className="consumable-tile" key={`${row.image}-${index}`}>
              <GameImage
                src={row.image}
                alt={name}
                className="reference-equipment-image consumable-tile-image"
                fallback={null}
              />
              <div className="consumable-tile-body">
                <div className="consumable-tile-heading">
                  <strong className="consumable-tile-name">
                    {renderBoldText(name)}
                  </strong>
                  {costWithUnit && (
                    <span className="consumable-tile-cost">
                      {/* An unconfirmed cost keeps its own placeholder; a
                          free-text cost an admin typed that isn't a number
                          is shown as-is rather than forced through the
                          pluralized unit message. */}
                      {Number.isFinite(Number(row.cost)) && row.cost !== ""
                        ? costWithUnit(Number(row.cost))
                        : row.cost || t("cost-unknown")}
                    </span>
                  )}
                </div>
                <p className="consumable-tile-description">
                  {renderBoldText(description)}
                </p>
              </div>
            </article>
          );
        })}
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
      {/* Bloc 65/A: the Intro block is a tile grid too now — same grid,
          same tile, no cost badge (its rows have no price to show). */}
      <ReferenceTileGrid
        title={t("introTitle")}
        rows={catalog.intro}
        t={t}
        locale={locale}
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
      {/* Bloc 48/D: category order follows consumableCategories
          (alphabetical: Conseillers, Équipement, Expédition, Inventaire),
          same order as the filter buttons above.
          Bloc 64/C: rendered as tile grids now, not tables. */}
      {consumableCategories
        .filter((category) => selectedCategories.has(category))
        .map((category) => (
          <ReferenceTileGrid
            key={category}
            title={categoryLabel(category)}
            rows={catalog[category]}
            t={t}
            costWithUnit={(cost) => t("cost-with-unit", { cost })}
            locale={locale}
          />
        ))}
    </div>
  );
}
