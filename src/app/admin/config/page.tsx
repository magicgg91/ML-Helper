import { getLocale, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import {
  AdminLanguagesPanel,
  type LanguageRow,
} from "@/components/admin-languages-panel";
import { PageHeader } from "@/components/admin-page-header";
import { Pill } from "@/components/admin-pill";
import { AdminSettingsSection } from "@/components/admin-settings-section";
import {
  AdminHighlightsPanel,
  type HighlightCandidate,
} from "@/components/admin-highlights-panel";
import { toolCategories } from "@/components/tool-category-grid";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { getHomeHighlights } from "@/lib/home-highlights-server";
import { maxHomeHighlights } from "@/lib/home-highlights";
import { referenceCatalog } from "@/lib/reference-catalog";
import { TrackingSettingsPanel } from "@/components/tracking-settings-panel";
import {
  alwaysActiveLocales,
  getLocaleActiveState,
  isAlwaysActiveLocale,
} from "@/lib/locale-settings";
import { prisma } from "@/lib/prisma";
import { getTrackingSettings } from "@/lib/site-settings";
import {
  hasLocalizedText,
  launchLocales,
  localizedText,
} from "@/lib/translations";

// Bloc 90/A: the Configuration tab is restricted to admin and super_admin —
// requireCapability("configuration.read") renders "Accès interdit" (403) for
// every other role, matching the nav link which is hidden for them too.
export default async function ConfigAdminPage() {
  const session = await requireCapability("configuration.read");
  // Revue Codex (PR #127): the tracking section is super_admin only — setting
  // a script URL means running code in this origin on everyone's pages. An
  // `admin` keeps the rest of the tab; showing them a field whose save is
  // refused would only be a trap.
  const canConfigureScripts = can(session.user.role, "configuration.scripts");
  const [t, state, tracking, guides, active, highlights, adminLocale] =
    await Promise.all([
      getTranslations("admin.config"),
      getLocaleActiveState(),
      getTrackingSettings(),
      // Bloc 119: how many guides are written in each language — the column
      // that makes the visibility switch answerable rather than blind.
      // Bloc 132 §4 : le titre et le slug servent aussi à la liste des
      // entrées qu'on peut mettre en avant.
      prisma.guide.findMany({
        where: {},
        select: { content: true, slug: true, title: true, status: true },
        orderBy: { publishedAt: "desc" },
      }),
      getCalculatorAvailability(),
      getHomeHighlights(),
      getLocale(),
    ]);
  // Bloc 90/B+D: every launched language, the always-active EN/FR base first,
  // each with its public visibility and whether it is locked.
  //
  // Bloc 120: derived from launchLocales rather than listed here. The previous
  // hardcoded order *filtered* against launchLocales, so a language added as a
  // messages/*.json file would have been missing from this table — present on
  // the public site, but impossible to deactivate.
  const order = [
    ...alwaysActiveLocales,
    ...launchLocales.filter((locale) => !isAlwaysActiveLocale(locale)),
  ];
  const rows: LanguageRow[] = order.map((locale) => ({
    locale,
    active: state[locale as keyof typeof state],
    locked: isAlwaysActiveLocale(locale),
    translated: guides.filter((guide) =>
      hasLocalizedText(guide.content, locale),
    ).length,
    total: guides.length,
  }));

  // Bloc 132 §4 : ce qu'on peut mettre en avant — tout ce qui est
  // publiquement visible, guides publiés compris. Les noms sont résolus ici,
  // dans la langue de l'administration, et triés : le panneau n'a plus qu'à
  // montrer et filtrer.
  const rootT = await getTranslations();
  const references = await getTranslations("references");
  const candidates: HighlightCandidate[] = [
    ...toolCategories
      .flatMap((category) => category.calculators)
      .filter((slug) => active[slug])
      .map((slug) => ({
        kind: "tool" as const,
        slug,
        name: rootT(`${slug}.name`),
      })),
    ...referenceCatalog
      .filter((reference) => active[reference.calculatorSlug])
      .map((reference) => ({
        kind: "reference" as const,
        slug: reference.slug,
        name: references(`catalog.${reference.slug}`),
      })),
    ...guides
      .filter((guide) => guide.status === "published")
      .map((guide) => ({
        kind: "guide" as const,
        slug: guide.slug,
        name: localizedText(guide.title, adminLocale),
      })),
  ].sort((a, b) => a.name.localeCompare(b.name, adminLocale));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <AdminSettingsSection
        title={t("highlights.section")}
        description={t("highlights.intro")}
        actions={
          <span>
            <Pill tone={highlights?.length ? "ok" : "neutral"}>
              {t("highlights.count", {
                count: highlights?.length ?? 0,
                max: maxHomeHighlights,
              })}
            </Pill>
          </span>
        }
      >
        {/* `undefined` (rien d'enregistré) et `[]` (panneau masqué exprès)
            arrivent distincts : le panneau les affiche différemment. */}
        <AdminHighlightsPanel candidates={candidates} initial={highlights} />
      </AdminSettingsSection>
      <AdminSettingsSection
        title={t("languages-section")}
        description={t("intro")}
      >
        <AdminLanguagesPanel rows={rows} />
      </AdminSettingsSection>
      {canConfigureScripts && (
        <AdminSettingsSection
          title={t("tracking.section")}
          description={t("tracking.intro")}
          actions={
            <span>
              <Pill tone={tracking.url ? "ok" : "neutral"}>
                {t(
                  tracking.url
                    ? "tracking.script-active"
                    : "tracking.script-inactive",
                )}
              </Pill>
            </span>
          }
        >
          <TrackingSettingsPanel
            url={tracking.url ?? ""}
            websiteId={tracking.websiteId ?? ""}
          />
        </AdminSettingsSection>
      )}
    </div>
  );
}
