import { PlayerSettingsPanel } from "../../../components/player-settings-panel";
import { ToolCategoryNav } from "../../../components/tool-category-nav";
import { getCalculatorAvailability } from "../../../lib/calculators-server";
import { connection } from "next/server";

export default async function ToolsLayout({ children }: LayoutProps<"/tools">) {
  await connection();
  const active = await getCalculatorAvailability();
  const availability = {
    villes:
      active["city-cost"] ||
      active["city-max-level"] ||
      active["city-production"],
    classement: active.ranking,
    competences:
      active["stuff-simulator"] ||
      active["stuff-comparison"] ||
      active.gems ||
      active.templars,
    referentiels: active["combat-equipment"] || active["expedition-equipment"],
  };
  return (
    <>
      <PlayerSettingsPanel />
      <ToolCategoryNav availability={availability} />
      {children}
    </>
  );
}
