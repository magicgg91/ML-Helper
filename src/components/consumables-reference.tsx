"use client";

import { useLocale, useTranslations } from "next-intl";
import { GameImage } from "./game-image";
import { MarkdownRenderer } from "./markdown-renderer";
import { localizedText } from "../lib/translations";
import type { EditorialLocale } from "./editorial-locale-select";
import type { ConsumableRow } from "../lib/consumables";

// Bloc 44 review: item name/description are flat fr/en-suffixed fields
// (never omitted, only ever "" when blank), so localizedText()'s
// missing-key fallback doesn't apply here — an explicit "" must still be
// treated as absent. en gets its own preference (unchanged from before);
// every other locale (fr included, and de/es/tr with no item-level
// translation of their own) prefers fr, matching this app's own
// defaultLocale, and now falls back to en too if fr is blank.
function pickLocaleText(fr: string, en: string, locale: string): string {
  return locale === "en" ? en || fr : fr || en;
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
  const locale = useLocale();
  const introText = localizedText(intro, locale);

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
    </div>
  );
}
