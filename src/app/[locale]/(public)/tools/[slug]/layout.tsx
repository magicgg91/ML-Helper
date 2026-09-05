import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { PlayerSettingsPanel } from "../../../../../components/player-settings-panel";
import { ToolCategoryNav } from "../../../../../components/tool-category-nav";
import { getCalculatorAvailability } from "../../../../../lib/calculators-server";
import { JsonLd } from "../../../../../components/json-ld";
import { webApplicationJsonLd } from "../../../../../lib/structured-data";
import { Breadcrumb } from "../../../../../components/breadcrumb";

// Bloc 91/M4: same slug→title-key map as the page's generateMetadata — kept
// here so the WebApplication JSON-LD is emitted once for all 4 categories
// (the layout wraps every valid tool detail page).
const toolTitleKeys: Record<string, string> = {
  villes: "cities",
  combat: "combat",
  classement: "ranking",
  competences: "skills",
};

export default async function ToolDetailLayout({
  children,
  params,
}: LayoutProps<"/[locale]/tools/[slug]">) {
  await connection();
  const { slug } = await params;
  const [active, tools, nav, locale] = await Promise.all([
    getCalculatorAvailability(),
    getTranslations("tools"),
    getTranslations("Navigation"),
    getLocale(),
  ]);
  const titleKey = toolTitleKeys[slug];
  const availability = {
    villes:
      active["city-cost"] ||
      active["city-max-level"] ||
      active["city-production"] ||
      active["city-rewards"],
    combat: active["xp-gain-rate"] || active["demo-attack-troops"],
    classement: active.ranking,
    competences:
      active["stuff-simulator"] ||
      active["expedition-equipment-simulator"] ||
      active.gems ||
      active.templars,
  };

  return (
    <>
      {titleKey && (
        <>
          <JsonLd
            data={webApplicationJsonLd({
              locale,
              path: `/tools/${slug}`,
              name: tools(titleKey),
            })}
          />
          {/* Bloc 91/M7: breadcrumb — the tool h1 is sr-only, so this is the
              visible marker of which tool page you're on. */}
          <Breadcrumb
            locale={locale}
            label={nav("breadcrumb")}
            items={[
              { path: "/", label: nav("home") },
              { path: "/tools", label: nav("tools") },
              { path: `/tools/${slug}`, label: tools(titleKey) },
            ]}
          />
        </>
      )}
      <PlayerSettingsPanel />
      <ToolCategoryNav availability={availability} />
      {children}
    </>
  );
}
