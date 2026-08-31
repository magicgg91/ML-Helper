import type { Metadata } from "next";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import { getTranslations } from "next-intl/server";
import { languageAlternates } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tools] = await Promise.all([
    getTranslations("Public"),
    getTranslations("tools"),
  ]);
  return {
    title: t("tools"),
    description: tools("subtitle"),
    alternates: { languages: languageAlternates("/tools") },
  };
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
