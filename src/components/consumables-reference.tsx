"use client";

import { useLocale, useTranslations } from "next-intl";
import { GameImage } from "./game-image";
import { MarkdownRenderer } from "./markdown-renderer";
import type { ConsumableRow } from "../lib/consumables";

// Bloc 43: the only reference with 2 public zones — a free-text markdown
// block (filled in by the porteur de projet via admin) above the items
// table. Costs are shown at raw value, never compacted to k/M (cdc section
// 3.3 exception, same rule already applied to Gemmes' prices).
export function ConsumablesReferenceTable({
  intro,
  rows,
}: {
  intro: { fr: string; en: string };
  rows: ConsumableRow[];
}) {
  const t = useTranslations("references.consumables");
  const locale = useLocale();
  const introText = locale === "en" ? intro.en || intro.fr : intro.fr;

  return (
    <div className="calculator-stack">
      {introText && <MarkdownRenderer markdown={introText} />}
      <section className="calculator-card ranking-table-wrap">
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
                const name =
                  locale === "en" ? row.name_en || row.name_fr : row.name_fr;
                const description =
                  locale === "en"
                    ? row.description_en || row.description_fr
                    : row.description_fr;
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
    </div>
  );
}
