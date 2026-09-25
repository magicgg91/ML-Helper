import type { Metadata } from "next";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { toolCategories } from "@/components/tool-category-grid";
import { ToolCategorySections } from "@/components/tool-category-sections";
import { Breadcrumb } from "@/components/public-breadcrumb";
import { PageHeader } from "@/components/public-page-header";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";
import { toolCategoryOrder, toolEntryHref } from "@/lib/tool-links";
import { getPublicDescriptions } from "@/lib/tool-descriptions-server";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tools, locale] = await Promise.all([
    getTranslations("Public"),
    getTranslations("tools"),
    getLocale(),
  ]);
  // The /tools index keeps its own description — it describes the hub, not a
  // single category (those get their own description, Bloc 91/E2).
  return pageMetadata({
    locale,
    path: "/tools",
    title: t("tools"),
    description: tools("index-intro"),
  });
}

export default async function ToolsPage() {
  const active = await getCalculatorAvailability();
  const [t, navigation, rootT, locale] = await Promise.all([
    getTranslations("tools"),
    getTranslations("Navigation"),
    getTranslations(),
    getLocale(),
  ]);
  // Les descriptions d'outils éditées en administration (Bloc 130) se lisent
  // ici : une page de catégorie héberge plusieurs outils derrière des
  // onglets et ne peut nommer qu'elle-même (§3.8), donc cet index est le
  // seul endroit public où chacune a sa place. Vide, elle n'est pas rendue.
  const descriptions = await getPublicDescriptions(locale);
  // Bloc 129 §3.2 : chaque carte liste ses outils. Un outil désactivé en
  // administration n'apparaît pas — la carte ne promet que ce qui existe.
  const toolLinks = Object.fromEntries(
    toolCategories.map((category) => [
      category.slug,
      category.calculators
        .filter((slug) => active[slug])
        .flatMap((slug) => {
          const href = toolEntryHref(slug);
          return href
            ? [
                {
                  href,
                  label: rootT(`${slug}.name`),
                  description: descriptions[slug] || undefined,
                },
              ]
            : [];
        }),
    ]),
  );
  return (
    <main className="public-main">
      <Breadcrumb
        label={navigation("breadcrumb")}
        items={[
          { label: navigation("home"), href: "/" },
          { label: navigation("tools") },
        ]}
      />
      <div className="index-layout">
        <PageHeader title={t("index-title")} description={t("index-intro")} />
        {/* §3.2 : l'encart rappelle que les paramètres du joueur se
            renseignent une fois pour tous les outils. Le bloc lui-même est
            hors périmètre (§0) et n'est pas touché. */}
        <aside className="index-note">{t("settings-note")}</aside>
      </div>
      {/* Bloc 132 §6 : une carte par catégorie, l'une sous l'autre, les
          outils en tuiles. L'accueil garde la grille de cartes. */}
      <ToolCategorySections
        active={active}
        t={t}
        toolLinks={toolLinks}
        order={toolCategoryOrder}
      />
    </main>
  );
}
