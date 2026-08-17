import { PlayerSettingsPanel } from "../../../components/player-settings-panel";
import { ToolCategoryNav } from "../../../components/tool-category-nav";

export default function ToolsLayout({ children }: LayoutProps<"/tools">) {
  return (
    <>
      <PlayerSettingsPanel />
      <ToolCategoryNav />
      {children}
    </>
  );
}
