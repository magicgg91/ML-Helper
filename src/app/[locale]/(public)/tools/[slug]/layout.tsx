import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { PlayerSettingsPanel } from "../../../../../components/player-settings-panel";
import { ToolCategoryNav } from "../../../../../components/tool-category-nav";
import { Breadcrumb } from "../../../../../components/public-breadcrumb";
import { PageHeader } from "../../../../../components/public-page-header";
import { ReportErrorLink } from "../../../../../components/report-error-link";
import { contactPageLabel } from "../../../../../lib/contact-link";
import { FurtherReading } from "../../../../../components/further-reading";
import { furtherReading } from "../../../../../lib/site-highlights";
import {
  toolEntryHref,
  type ToolCategorySlug,
} from "../../../../../lib/tool-links";
import { prisma } from "../../../../../lib/prisma";
import { localizedText } from "../../../../../lib/translations";
import { getCalculatorAvailability } from "../../../../../lib/calculators-server";
import { getRankingLadder } from "../../../../../lib/ranking";
import { JsonLd } from "../../../../../components/json-ld";
import { webApplicationJsonLd } from "../../../../../lib/structured-data";
import { BreadcrumbJsonLd } from "../../../../../components/breadcrumb-json-ld";

// Bloc 91/M4: same slug→title-key map as the page's generateMetadata — kept
// here so the WebApplication JSON-LD is emitted once for all 4 categories
// (the layout wraps every valid tool detail page).
const toolTitleKeys: Record<string, string> = {
  villes: "cities",
  combat: "combat",
  classement: "ranking",
  competences: "skills",
};

export default async function ToolDetailLayout({
  children,
  params,
}: LayoutProps<"/[locale]/tools/[slug]">) {
  await connection();
  const { slug } = await params;
  const [active, tools, nav, publicT, locale] = await Promise.all([
    getCalculatorAvailability(),
    getTranslations("tools"),
    getTranslations("Navigation"),
    getTranslations("Public"),
    getLocale(),
  ]);
  const titleKey = toolTitleKeys[slug];
  // §3.8 : « Aller plus loin », configurable et masquée si vide. Les titres
  // des guides sont lus en base ; un guide dépublié depuis disparaît de la
  // section au lieu d'y laisser un lien mort.
  const entries = furtherReading[slug as ToolCategorySlug] ?? [];
  const guides = entries.some((entry) => entry.kind === "guide")
    ? await prisma.guide.findMany({
        where: {
          status: "published",
          slug: {
            in: entries.flatMap((entry) =>
              entry.kind === "guide" ? [entry.slug] : [],
            ),
          },
        },
        select: { slug: true, title: true },
      })
    : [];
  const rootT = await getTranslations();
  const cards = entries.flatMap((entry) => {
    if (entry.kind === "guide") {
      const guide = guides.find((candidate) => candidate.slug === entry.slug);
      return guide
        ? [
            {
              href: `/guides/${guide.slug}`,
              kind: tools("kind-guide"),
              title: localizedText(guide.title, locale),
            },
          ]
        : [];
    }
    const href = toolEntryHref(entry.slug);
    return href
      ? [
          {
            href,
            kind: tools("kind"),
            title: rootT(`${entry.slug}.name`),
          },
        ]
      : [];
  });
  const availability = {
    villes:
      active["city-cost"] ||
      active["city-max-level"] ||
      active["city-production"] ||
      active["city-rewards"],
    combat: active["xp-gain-rate"] || active["demo-attack-troops"],
    classement: active.ranking,
    competences:
      active["stuff-simulator"] ||
      active["expedition-equipment-simulator"] ||
      active.gems ||
      active.templars,
  };

  return (
    <>
      {titleKey && (
        <>
          <JsonLd
            data={webApplicationJsonLd({
              locale,
              path: `/tools/${slug}`,
              name: tools(titleKey),
            })}
          />
          {/* Bloc 91/M4: BreadcrumbList structured data. Bloc 94 removed the
              visible trail: this page's <h1> is sr-only, but ToolCategoryNav
              below already marks the current category with the accent style,
              carrying the same label the last crumb did. */}
          <BreadcrumbJsonLd
            locale={locale}
            items={[
              { path: "/", label: nav("home") },
              { path: "/tools", label: nav("tools") },
              { path: `/tools/${slug}`, label: tools(titleKey) },
            ]}
          />
        </>
      )}
      {/* Bloc 129 §2.3 et §3.8 : le fil d'Ariane visible et l'en-tête de page
          reviennent au-dessus de l'outil. Le Bloc 94 les avait retirés en
          comptant sur la seule mise en évidence de l'onglet de catégorie.

          Le titre nomme la CATÉGORIE, pas l'outil affiché : une page de
          catégorie héberge plusieurs outils derrière des onglets côté
          client, et faire suivre le titre à l'onglet actif demanderait de
          sortir l'état des onglets des composants de calcul — c'est-à-dire
          de toucher à l'intérieur des outils, que le §0 met hors périmètre.
          Signalé dans le PR. */}
      {titleKey && (
        <div className="tool-page-head">
          <Breadcrumb
            label={nav("breadcrumb")}
            items={[
              { label: nav("home"), href: "/" },
              { label: nav("tools"), href: "/tools" },
              { label: tools(titleKey) },
            ]}
          />
          <PageHeader
            title={tools(titleKey)}
            description={tools(`descriptions.${titleKey}`)}
            action={
              <ReportErrorLink
                label={publicT("report-error")}
                page={contactPageLabel(nav("tools"), tools(titleKey))}
              />
            }
          />
        </div>
      )}
      {/* Bloc 108/E: the ladder reaches the panel so its division field can
          offer the divisions an admin has actually configured. */}
      <PlayerSettingsPanel ladder={await getRankingLadder()} />
      {/* §3.8 : la navigation entre outils vit dans une carte — la rangée
          des catégories, puis celle des outils de la catégorie, que le
          contenu de l'outil rend lui-même. */}
      <section className="tool-nav-card">
        <ToolCategoryNav
          availability={availability}
          counts={{
            villes: [
              "city-cost",
              "city-max-level",
              "city-production",
              "city-rewards",
            ].filter((slug) => active[slug as keyof typeof active]).length,
            combat: ["xp-gain-rate", "demo-attack-troops"].filter(
              (slug) => active[slug as keyof typeof active],
            ).length,
            classement: active.ranking ? 1 : 0,
            competences: [
              "stuff-simulator",
              "expedition-equipment-simulator",
              "gems",
              "templars",
            ].filter((slug) => active[slug as keyof typeof active]).length,
          }}
        />
      </section>
      {children}
      <FurtherReading title={tools("further-reading")} cards={cards} />
    </>
  );
}
