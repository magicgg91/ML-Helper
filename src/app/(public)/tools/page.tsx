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
      <ToolCategoryGrid active={active} t={t} />
    </main>
  );
}
