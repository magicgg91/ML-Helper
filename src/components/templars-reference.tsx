"use client";

import { useTranslations } from "next-intl";
import { formatGameNumber } from "../lib/city-calculators";
import {
  templarLevelCost,
  type TemplarParameters,
} from "../lib/templar-parameters";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog } from "../lib/reference-catalog";

export function TemplarsReferenceTable({
  parameters,
}: {
  parameters: TemplarParameters;
}) {
  const t = useTranslations("templars");
  const crossReference = useTranslations("crossReference");
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
                      <td>{formatGameNumber(item)}</td>
                      <td>{formatGameNumber(cumulative[index])}</td>
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
