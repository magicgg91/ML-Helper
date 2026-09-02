import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CityCalculators } from "../../../../components/city-calculators";
import { RankingCalculator } from "../../../../components/ranking-calculator";
import { SkillsCalculators } from "../../../../components/skills-calculators";
import { CombatCalculators } from "../../../../components/combat-calculators";
import { getRankingConfig } from "../../../../lib/ranking";
import { getCalculatorAvailability } from "../../../../lib/calculators-server";
import {
  getCityParameters,
  getTemplarParameters,
  getCombatParameters,
  getGemParameters,
} from "../../../../lib/admin-formulas-server";
import {
  getCombatReferenceRows,
  getExpeditionReferenceRows,
  getExpeditionStarIncrements,
} from "../../../../lib/reference-equipment-server";
import { getTranslations } from "next-intl/server";
import { pageTitle } from "../../../../lib/page-title";
import { languageAlternates } from "../../../../lib/site-url";

const toolTitleKeys: Record<string, string> = {
  villes: "cities",
  combat: "combat",
  classement: "ranking",
  competences: "skills",
};

export async function generateMetadata({
  params,
}: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const key = toolTitleKeys[slug];
  if (!key) return {};
  const [publicTranslations, tools] = await Promise.all([
    getTranslations("Public"),
    getTranslations("tools"),
  ]);
  return {
    title: pageTitle(publicTranslations("tools"), tools(key)),
    description: tools("subtitle"),
    alternates: { languages: languageAlternates(`/tools/${slug}`) },
  };
}

export default async function ToolPage({
  params,
  searchParams,
}: PageProps<"/tools/[slug]">) {
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
