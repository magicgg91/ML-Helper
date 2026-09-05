"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, type CSSProperties } from "react";
import { gemImagePath, skillColor } from "../lib/game-images";
import type { GemParameters } from "../lib/gem-parameters";
import { leagues, skillKeys, type SkillKey } from "../lib/player-settings";
import { GameImage } from "./game-image";
import { formatPercent } from "./reference-tables";
import { CrossReferenceLink } from "./cross-reference-link";
import { referenceCatalog } from "../lib/reference-catalog";

// Bloc 65/D: one tile per skill, replacing the 11 x 7 matrix table that
// needed a horizontal scroll on a phone and was already cramped on
// desktop. Each tile keeps all 6 leagues side by side inside itself: the
// skill x league comparison is the whole point of this reference, so
// unlike Level Up/Classement (Bloc 61) it gets no single-league selector.
function GemSkillTile({
  skill,
  parameters,
}: {
  skill: SkillKey;
  parameters: GemParameters;
}) {
  const game = useTranslations("game");
  const locale = useLocale();
  const color = skillColor(skill);
  const skillName = game(`skills.${skill}`);
  return (
    <article
      className="gems-tile"
      data-testid={`gems-tile-${skill}`}
      style={
        {
          borderColor: color,
          background: `color-mix(in srgb, ${color} 14%, var(--surface))`,
        } as CSSProperties
      }
    >
      <h2 className="gems-tile-title">{skillName}</h2>
      <table className="gems-tile-table">
        <tbody>
          <tr>
            {leagues.map((league) => (
              <th key={league} scope="col">
                {game(`leagues.${league}`)}
              </th>
            ))}
          </tr>
          <tr>
            {leagues.map((league) => (
              <td key={league} className="value">
                {formatPercent(
                  parameters.skillLeagueValue[skill][league],
                  locale,
                )}
              </td>
            ))}
          </tr>
          <tr>
            {leagues.map((league) => (
              <td key={league}>
                <GameImage
                  src={gemImagePath(skill, league)}
                  alt={`${skillName} ${game(`leagues.${league}`)}`}
                  className="gems-tile-image"
                  fallback={null}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </article>
  );
}

export function GemsReferenceTable({
  parameters,
}: {
  parameters: GemParameters;
}) {
  const t = useTranslations("gems");
  const game = useTranslations("game");
  const crossReference = useTranslations("crossReference");
  const locale = useLocale();
  const gemsReference = referenceCatalog.find((item) => item.slug === "gems")!;

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
      <div className="gems-tile-grid">
        {/* Bloc 65/D: the price of a single gem varies by league (unlike
            the fixed prices other references carry), so it keeps its own
            tile — full width and first, in neutral grey since it belongs
            to no skill, and 2 rows only (no gem image to show). */}
        <article
          className="gems-tile gems-cost-tile"
          data-testid="gems-tile-cost"
        >
          <h2 className="gems-tile-title">{t("reference.price-row")}</h2>
          <table className="gems-tile-table">
            <tbody>
              <tr>
                {leagues.map((league) => (
                  <th key={league} scope="col">
                    {game(`leagues.${league}`)}
                  </th>
                ))}
              </tr>
              <tr>
                {leagues.map((league) => (
                  <td key={league} className="value">
                    {league === "bronze"
                      ? "—"
                      : // Bloc 38/E: this reference shows the exact price,
                        // never compacted to k/M like formatGameNumber does
                        // elsewhere — values stay at most 4 digits, so
                        // compaction only hurts readability here.
                        Math.round(parameters.gemPrice[league])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </article>
        {orderedSkills.map((skill) => (
          <GemSkillTile key={skill} skill={skill} parameters={parameters} />
        ))}
      </div>
      <CrossReferenceLink
        href="/tools/competences?open=gems"
        title={t("name")}
        image={gemsReference.image}
        fallbackImage={gemsReference.fallbackImage}
        label={crossReference("toTool")}
      />
    </div>
  );
}
