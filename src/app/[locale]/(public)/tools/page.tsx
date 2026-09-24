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
    description: tools("index-intro"),
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
      {/* Bloc 129 §3.2 : la page s'appelle « Outils » et porte sa propre
          introduction. Le Bloc 38/K lui faisait reprendre mot pour mot le
          titre de la section Outils de l'accueil ; le brief leur donne
          chacun son rôle. Le reste de la page (cartes en 4 colonnes,
          liste des outils par catégorie) arrive à l'étape suivante. */}
      <h1 className="tools-page-title">{t("index-title")}</h1>
      <p>{t("index-intro")}</p>
      <ToolCategoryGrid active={active} locale={locale} t={t} />
    </main>
  );
}
