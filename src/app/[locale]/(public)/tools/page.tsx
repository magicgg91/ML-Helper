import type { Metadata } from "next";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { ToolCategoryGrid } from "@/components/tool-category-grid";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tools, locale] = await Promise.all([
    getTranslations("Public"),
    getTranslations("tools"),
    getLocale(),
  ]);
  // The /tools index keeps the section-wide tools.subtitle — it describes the
  // hub, not a single category (those get their own description, Bloc 91/E2).
  return pageMetadata({
    locale,
    path: "/tools",
    title: t("tools"),
    description: tools("subtitle"),
  });
}

export default async function ToolsPage() {
  const active = await getCalculatorAvailability();
  const [t, locale] = await Promise.all([
    getTranslations("tools"),
    getLocale(),
  ]);
  return (
    <main className="public-main">
      <h1 className="tools-page-title">{t("title")}</h1>
      {/* Bloc 38/K: same title and intro sentence as the homepage's tools
          section, so /tools reads as the same entry point reached a
          different way. */}
      <p>{t("subtitle")}</p>
      <ToolCategoryGrid active={active} locale={locale} t={t} />
    </main>
  );
}
