"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import {
  templarLevelCost,
  type TemplarParameters,
} from "../lib/templar-parameters";
import { CrossReferenceLink } from "./cross-reference-link";
import { GameImage } from "./game-image";
import { referenceCatalog } from "../lib/reference-catalog";
import { skillColor } from "../lib/game-images";
import { templarKeys, type TemplarKey } from "../lib/player-settings";
import type {
  TemplarPresentationCatalog,
  TemplarPresentationRow,
} from "../lib/templars-presentation";

function pickLocaleText(fr: string, en: string, locale: string): string {
  return locale === "fr" ? fr || en : en || fr;
}

// Bloc 66/B: one tile per Templar, colored by its associated competence
// (skillColor, same per-skill palette as Gemmes' tiles) — image left at
// 6rem (Boutique's own size, Bloc 65/C), Base Temple then Bonus below the
// title. Fixed order (templarKeys), never sorted: the set of 5 is complete
// and its order is already alphabetical on the French competence names.
function TemplarPresentationTile({
  templarKey,
  row,
  locale,
}: {
  templarKey: TemplarKey;
  row: TemplarPresentationRow;
  locale: string;
}) {
  const t = useTranslations("templars");
  const color = skillColor(templarKey);
  const name = pickLocaleText(row.name_fr, row.name_en, locale);
  return (
    <article
      className="templars-tile"
      data-testid={`templars-tile-${templarKey}`}
      style={
        {
          borderColor: color,
          background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
        } as CSSProperties
      }
    >
      <GameImage
        src={row.image}
        alt={name}
        className="templars-tile-image"
        fallback={null}
      />
      <div className="templars-tile-body">
        <h3 className="templars-tile-title">
          {t("presentation.tile-title", { name })}
        </h3>
        <p className="templars-tile-stat">
          {t("presentation.temple-base-label")} : {row.temple_base}%
        </p>
        <p className="templars-tile-stat">
          {t("presentation.bonus-label")} : {row.bonus}%
        </p>
      </div>
    </article>
  );
}

export function TemplarsReferenceTable({
  parameters,
  presentation,
}: {
  parameters: TemplarParameters;
  presentation: TemplarPresentationCatalog;
}) {
  const t = useTranslations("templars");
  const crossReference = useTranslations("crossReference");
  const locale = useLocale();
  const templarsReference = referenceCatalog.find(
    (item) => item.slug === "templars",
  )!;
  const costs = Array.from({ length: 20 }, (_, index) =>
    templarLevelCost(index + 1, parameters),
  );
  const cumulative = costs.map((_, index) =>
    costs.slice(0, index + 1).reduce((sum, item) => sum + item, 0),
  );
  // Bloc 64/E: 2 columns of 10 levels side by side, the layout Level Up
  // already uses — 20 rows fit in one screen that way, with no pagination
  // to add (Level Up only paginates because it runs far past 20 levels).
  const columns = [costs.slice(0, 10), costs.slice(10)];
  return (
    <div className="calculator-stack">
      {/* Bloc 66/B: the presentation tiles come first, before the cost
          table below (unchanged 2x10 structure from Bloc 64/E). */}
      <div className="templars-tile-grid">
        {templarKeys.map((key) => (
          <TemplarPresentationTile
            key={key}
            templarKey={key}
            row={presentation[key]}
            locale={locale}
          />
        ))}
      </div>
      <h2 className="editable-reference-title">{t("cost-table")}</h2>
      <section className="split-reference-tables">
        {columns.map((column, columnIndex) => (
          <section
            className="calculator-card ranking-table-wrap"
            key={columnIndex}
          >
            <table className="ranking-table reference-simple-table">
              <thead>
                <tr>
                  <th>{t("columns.level")}</th>
                  <th>{t("columns.level-cost")}</th>
                  <th>{t("columns.cumulative-cost")}</th>
                </tr>
              </thead>
              <tbody>
                {column.map((item, indexInColumn) => {
                  const index = columnIndex * 10 + indexInColumn;
                  return (
                    <tr key={index + 1}>
                      <td>{index + 1}</td>
                      {/* Bloc 66/D: unlike other reference tables, this cost
                          must never be compacted to k/M — the task's own
                          spec example shows the full digit sequence. */}
                      <td>{Math.round(item)}</td>
                      <td>{Math.round(cumulative[index])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </section>
      <CrossReferenceLink
        href="/tools/competences?open=templars"
        title={t("name")}
        image={templarsReference.image}
        fallbackImage={templarsReference.fallbackImage}
        label={crossReference("toTool")}
      />
    </div>
  );
}
