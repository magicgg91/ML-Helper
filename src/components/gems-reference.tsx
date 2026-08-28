"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { gemImagePath } from "../lib/game-images";
import type { GemParameters } from "../lib/gem-parameters";
import { leagues, skillKeys } from "../lib/player-settings";
import { GameImage } from "./game-image";
import { formatPercent } from "./reference-tables";

export function GemsReferenceTable({
  parameters,
}: {
  parameters: GemParameters;
}) {
  const t = useTranslations("gems");
  const game = useTranslations("game");
  const locale = useLocale();

  // Bloc 36/A: alphabetical order on the *displayed* skill name, which
  // differs by locale (e.g. Guardian/Défense sorts differently in fr vs
  // en) — never on the technical SkillKey, and never a fixed hardcoded
  // order.
  const orderedSkills = useMemo(
    () =>
      [...skillKeys].sort((a, b) =>
        game(`skills.${a}`).localeCompare(game(`skills.${b}`), locale),
      ),
    [game, locale],
  );

  return (
    <div className="calculator-stack">
      <section className="calculator-card ranking-table-wrap">
        <div className="table-scroll">
          <table className="ranking-table reference-table gems-reference-table reference-simple-table">
            <thead>
              <tr>
                <th></th>
                {leagues.map((league) => (
                  <th key={league}>{game(`leagues.${league}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t("reference.price-row")}</th>
                {leagues.map((league) => (
                  <td key={league} className="value">
                    {league === "bronze"
                      ? "—"
                      : // Bloc 38/E: this reference shows the exact price, never
                        // compacted to k/M like formatGameNumber does elsewhere —
                        // values stay at most 4 digits, so compaction only hurts
                        // readability here.
                        Math.round(parameters.gemPrice[league])}
                  </td>
                ))}
              </tr>
              {orderedSkills.map((skill) => (
                <tr key={skill}>
                  <th scope="row">{game(`skills.${skill}`)}</th>
                  {leagues.map((league) => {
                    const label = `${game(`skills.${skill}`)} ${game(`leagues.${league}`)}`;
                    return (
                      <td key={league} className="value">
                        {/* Bloc 38/C: image and % side by side, not stacked —
                            .reference-equipment-image's own display:block
                            (needed when it's alone in its column on the
                            Combat/Expedition tables) would otherwise push the
                            percentage onto its own line here. */}
                        <span className="gems-value-row">
                          <GameImage
                            src={gemImagePath(skill, league)}
                            alt={label}
                            className="reference-equipment-image"
                            fallback={null}
                          />
                          {formatPercent(
                            parameters.skillLeagueValue[skill][league],
                            locale,
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Link className="reference-link" href="/tools/competences">
        {t("reference.competences-link")}
      </Link>
    </div>
  );
}
