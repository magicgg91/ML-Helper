import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CityCalculators } from "../../../../../components/city-calculators";
import { RankingCalculator } from "../../../../../components/ranking-calculator";
import { SkillsCalculators } from "../../../../../components/skills-calculators";
import { CombatCalculators } from "../../../../../components/combat-calculators";
import { getRankingConfig } from "../../../../../lib/ranking";
import { getCalculatorAvailability } from "../../../../../lib/calculators-server";
import {
  getCityParameters,
  getTemplarParameters,
  getCombatParameters,
  getGemParameters,
} from "../../../../../lib/admin-formulas-server";
import {
  getCombatReferenceRows,
  getCombatStarIncrements,
  getExpeditionReferenceRows,
  getExpeditionStarIncrements,
} from "../../../../../lib/reference-equipment-server";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../../../lib/page-metadata";

const toolTitleKeys: Record<string, string> = {
  villes: "cities",
  combat: "combat",
  classement: "ranking",
  competences: "skills",
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tools/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const key = toolTitleKeys[slug];
  if (!key) return {};
  const [tools, locale] = await Promise.all([
    getTranslations("tools"),
    getLocale(),
  ]);
  // Bloc 91/E2: each of the 4 categories now has its own description
  // (tools.descriptions.<key>) instead of the shared tools.subtitle, so the
  // pages are distinguishable in a SERP; Bloc 91/E3 adds the OG/Twitter card.
  return pageMetadata({
    locale,
    path: `/tools/${slug}`,
    title: tools(key),
    description: tools(`descriptions.${key}`),
  });
}

export default async function ToolPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tools/[slug]">) {
  const { slug } = await params;
  const { open } = await searchParams;
  const tools = await getTranslations("tools");
  const active = await getCalculatorAvailability();
  // Bloc 50/1b: /referentiels is now its own independent root (no longer a
  // #references section embedded in /guides) — this legacy redirect stub
  // (kept for old bookmarks/backlinks to the pre-Bloc-33 /tools/referentiels
  // URL) now points there instead.
  if (slug === "referentiels") redirect("/referentiels");
  if (!["villes", "combat", "classement", "competences"].includes(slug))
    notFound();
  if (slug === "combat") {
    const combat = await getCombatParameters();
    return (
      <main className="public-main">
        <h1 className="sr-only">{tools("combat")}</h1>
        <CombatCalculators
          cityParameters={await getCityParameters()}
          {...combat}
          availability={{
            xp: active["xp-gain-rate"],
            demo: active["demo-attack-troops"],
          }}
          initialTool={open === "xp" || open === "demo" ? open : undefined}
          levelUpReferenceActive={active["level-up"]}
        />
      </main>
    );
  }
  if (slug === "competences")
    return (
      <main className="public-main">
        <h1 className="sr-only">{tools("skills")}</h1>
        <SkillsCalculators
          templarParameters={await getTemplarParameters()}
          combatRows={await getCombatReferenceRows()}
          combatIncrements={await getCombatStarIncrements()}
          expeditionRows={await getExpeditionReferenceRows()}
          expeditionIncrements={await getExpeditionStarIncrements()}
          gemParameters={await getGemParameters()}
          availability={{
            simulator: active["stuff-simulator"],
            gems: active.gems,
            templars: active.templars,
            expedition: active["expedition-equipment-simulator"],
          }}
          initialTool={
            open === "simulator" ||
            open === "expedition" ||
            open === "gems" ||
            open === "templars"
              ? open
              : undefined
          }
        />
      </main>
    );
  if (slug === "classement") {
    const config = await getRankingConfig();
    return (
      <main className="public-main">
        <h1 className="sr-only">{tools("ranking")}</h1>
        {active.ranking ? (
          <RankingCalculator config={config} />
        ) : (
          <p className="empty-state">{tools("calculator-unavailable")}</p>
        )}
      </main>
    );
  }
  return (
    <main className="public-main">
      <h1 className="sr-only">{tools("cities")}</h1>
      <CityCalculators
        parameters={await getCityParameters()}
        availability={{
          cost: active["city-cost"],
          "max-level": active["city-max-level"],
          production: active["city-production"],
          rewards: active["city-rewards"],
        }}
      />
    </main>
  );
}
