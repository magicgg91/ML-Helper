import type { Metadata } from "next";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import {
  ToolCategoryGrid,
  toolCategories,
} from "@/components/tool-category-grid";
import { Breadcrumb } from "@/components/public-breadcrumb";
import { PageHeader } from "@/components/public-page-header";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";
import { toolCategoryOrder, toolEntryHref } from "@/lib/tool-links";

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
  // Bloc 129 §3.2 : chaque carte liste ses outils. Un outil désactivé en
  // administration n'apparaît pas — la carte ne promet que ce qui existe.
  const toolLinks = Object.fromEntries(
    toolCategories.map((category) => [
      category.slug,
      category.calculators
        .filter((slug) => active[slug])
        .flatMap((slug) => {
          const href = toolEntryHref(slug);
          return href ? [{ href, label: rootT(`${slug}.name`) }] : [];
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
      <ToolCategoryGrid
        active={active}
        locale={locale}
        t={t}
        toolLinks={toolLinks}
        order={toolCategoryOrder}
      />
    </main>
  );
}
