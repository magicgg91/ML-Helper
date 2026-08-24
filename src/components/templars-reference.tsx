"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatGameNumber } from "../lib/city-calculators";
import {
  templarLevelCost,
  type TemplarParameters,
} from "../lib/templar-parameters";

export function TemplarsReferenceTable({
  parameters,
}: {
  parameters: TemplarParameters;
}) {
  const t = useTranslations("templars");
  const costs = Array.from({ length: 20 }, (_, index) =>
    templarLevelCost(index + 1, parameters),
  );
  const cumulative = costs.map((_, index) =>
    costs.slice(0, index + 1).reduce((sum, item) => sum + item, 0),
  );
  return (
    <div className="calculator-stack">
      <section className="calculator-card ranking-table-wrap">
        <div className="table-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>{t("columns.level")}</th>
                <th>{t("columns.level-cost")}</th>
                <th>{t("columns.cumulative-cost")}</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((item, index) => (
                <tr key={index + 1}>
                  <td>{index + 1}</td>
                  <td>{formatGameNumber(item)}</td>
                  <td>{formatGameNumber(cumulative[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Link className="reference-link" href="/tools/competences">
        {t("competences-link")}
      </Link>
    </div>
  );
}
