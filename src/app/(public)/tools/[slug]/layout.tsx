import { connection } from "next/server";
import { PlayerSettingsPanel } from "../../../../components/player-settings-panel";
import { ToolCategoryNav } from "../../../../components/tool-category-nav";
import { getCalculatorAvailability } from "../../../../lib/calculators-server";

export default async function ToolDetailLayout({
  children,
}: LayoutProps<"/tools/[slug]">) {
  await connection();
  const active = await getCalculatorAvailability();
  const availability = {
    villes:
      active["city-cost"] ||
      active["city-max-level"] ||
      active["city-production"],
    combat: false,
    classement: active.ranking,
    competences:
      active["stuff-simulator"] ||
      active["stuff-comparison"] ||
      active.gems ||
      active.templars,
  };

  return (
    <>
      <PlayerSettingsPanel />
      <ToolCategoryNav availability={availability} />
      {children}
    </>
  );
}
