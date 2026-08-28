import type { Metadata } from "next";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return { title: t("tools") };
}

export default async function ToolsPage() {
  const active = await getCalculatorAvailability();
  const t = await getTranslations("tools");
  return (
    <main className="public-main">
      <h1 className="tools-page-title">{t("title")}</h1>
      {/* Bloc 38/K: same title and intro sentence as the homepage's tools
          section, so /tools reads as the same entry point reached a
          different way. */}
      <p>{t("subtitle")}</p>
      <ToolCategoryGrid active={active} t={t} />
    </main>
  );
}
