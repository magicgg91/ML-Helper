import { getLocale, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import {
  AdminLanguagesPanel,
  type LanguageRow,
} from "@/components/admin-languages-panel";
import { AdminLeaguesPanel } from "@/components/admin-leagues-panel";
import { AdminLogsPurge } from "@/components/admin-logs-purge";
import { PageHeader } from "@/components/admin-page-header";
import { Pill } from "@/components/admin-pill";
import { CollapsibleSection } from "@/components/admin-collapsible-section";
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
import { leaguesSectionAnchor } from "@/lib/admin-sections";
import { activeLadder, getLeagueLadder } from "@/lib/leagues";
import {
  alwaysActiveLocales,
  getLocaleActiveState,
  hiddenPublicLocales,
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
// requireCapability renders "Accès interdit" (403) for every other role,
// matching the nav link which is hidden for them too.
//
// Bloc 135 : à une exception près, « Gestion Outils », qui entre par
// `leagues.read` et ne voit que la section Ligues et divisions. Chaque section
// porte donc sa propre garde, comme le suivi et la purge le faisaient déjà.
export default async function ConfigAdminPage() {
  // Bloc 135 : deux domaines sur un écran. « Gestion Outils » n'a pas
  // `configuration.read` — il n'a rien à faire dans les langues du site — mais
  // il gère les ligues et les divisions depuis que leur CRUD a quitté l'écran
  // de l'outil Classement. Il entre donc ici, et n'y voit que sa section.
  const session = await requireCapability([
    "configuration.read",
    "leagues.read",
  ]);
  const canConfigureSite = can(session.user.role, "configuration.read");
  const canManageLeagues = can(session.user.role, "leagues.read");
  // Revue Codex (PR #127): the tracking section is super_admin only — setting
  // a script URL means running code in this origin on everyone's pages. An
  // `admin` keeps the rest of the tab; showing them a field whose save is
  // refused would only be a trap.
  const canConfigureScripts = can(session.user.role, "configuration.scripts");
  // Bloc 136 : demandé avant le reste, parce que le compte du journal ne se
  // lit que pour qui a le droit de le purger — et que la section n'existe
  // pas sans ce droit.
  const canPurge = can(session.user.role, "logs.purge");
  const [
    t,
    logs,
    leagueLabels,
    languageNames,
    state,
    tracking,
    guides,
    active,
    highlights,
    adminLocale,
    hiddenLocales,
    ladder,
  ] = await Promise.all([
    getTranslations("admin.config"),
    getTranslations("admin.logs"),
    getTranslations("admin.leagues"),
    // Nommées là où cet écran les nomme déjà, comme partout ailleurs.
    getTranslations("admin.config.languages"),
    getLocaleActiveState(),
    getTrackingSettings(),
    // Bloc 119: how many guides are written in each language — the column
    // that makes the visibility switch answerable rather than blind.
    // Bloc 132 §4 : le titre et le slug servent aussi à la liste des
    // entrées qu'on peut mettre en avant.
    // Bloc 135 : seulement pour qui voit les sections qui s'en servent (le
    // tableau des langues et la liste des mises en avant). « Gestion
    // Outils » entre sur cet écran pour les ligues et n'a pas `guides.read`.
    canConfigureSite
      ? prisma.guide.findMany({
          where: {},
          select: { content: true, slug: true, title: true, status: true },
          orderBy: { publishedAt: "desc" },
        })
      : [],
    getCalculatorAvailability(),
    getHomeHighlights(),
    getLocale(),
    hiddenPublicLocales(),
    getLeagueLadder(),
  ]);
  // Le journal n'est compté que si la carte s'affiche.
  const loggedEntries = canPurge ? await prisma.auditLog.count() : 0;
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
      {/* Bloc 136 : chaque section se replie, et son identifiant est son
          ancre — /admin/config#langues ouvre les langues et les amène à
          l'écran, /admin/config#ligues-divisions la section du Bloc 135. */}
      {canConfigureSite && (
        <CollapsibleSection
          id="mis-en-avant"
          title={t("highlights.section")}
          description={t("highlights.intro")}
          summary={
            <Pill tone={highlights?.length ? "ok" : "neutral"}>
              {t("highlights.count", {
                count: highlights?.length ?? 0,
                max: maxHomeHighlights,
              })}
            </Pill>
          }
        >
          {/* `undefined` (rien d'enregistré) et `[]` (panneau masqué exprès)
            arrivent distincts : le panneau les affiche différemment. */}
          <AdminHighlightsPanel candidates={candidates} initial={highlights} />
        </CollapsibleSection>
      )}
      {/* Bloc 135 §2 : les ligues et les divisions, venues de l'écran de
          l'outil Classement. Placées ici, entre la sélection de l'accueil et
          les langues du site : c'est un référentiel de jeu, du même ordre que
          les langues — une liste que tout le site lit et qu'on ouvre quelques
          fois par saison — et non un réglage technique. Le rouge de la purge
          reste en dernier, l'ordre de l'écran allant de l'éditorial aux
          référentiels puis à l'irréversible. */}
      {canManageLeagues && (
        <CollapsibleSection
          id={leaguesSectionAnchor}
          title={leagueLabels("section")}
          description={leagueLabels("intro")}
          summary={
            <Pill tone="neutral">
              {leagueLabels("summary", {
                count: ladder.length,
                active: activeLadder(ladder).length,
              })}
            </Pill>
          }
        >
          <AdminLeaguesPanel
            initialLadder={ladder}
            hiddenLocales={hiddenLocales}
            languageNames={Object.fromEntries(
              launchLocales.map((code) => [
                code,
                languageNames.has(code)
                  ? languageNames(code)
                  : code.toUpperCase(),
              ]),
            )}
          />
        </CollapsibleSection>
      )}
      {canConfigureSite && (
        <CollapsibleSection
          id="langues"
          title={t("languages-section")}
          description={t("intro")}
          summary={
            <Pill tone="neutral">
              {t("languages-summary", {
                count: rows.filter((row) => row.active).length,
                total: rows.length,
              })}
            </Pill>
          }
        >
          <AdminLanguagesPanel rows={rows} />
        </CollapsibleSection>
      )}
      {canConfigureScripts && (
        <CollapsibleSection
          id="suivi-visites"
          title={t("tracking.section")}
          description={t("tracking.intro")}
          summary={
            <Pill tone={tracking.url ? "ok" : "neutral"}>
              {t(
                tracking.url
                  ? "tracking.script-active"
                  : "tracking.script-inactive",
              )}
            </Pill>
          }
        >
          <TrackingSettingsPanel
            url={tracking.url ?? ""}
            websiteId={tracking.websiteId ?? ""}
          />
        </CollapsibleSection>
      )}
      {/* Bloc 131/E : la purge du journal, venue de la page Historique. Elle
          y était la seule action destructive au bas d'une page qu'on ouvre
          pour *chercher* une entrée, et rien ne sépare mal comme la
          proximité. Elle finit ici, en dernier, avec la même garde
          `logs.purge`.

          Bloc 136 : repliable comme les autres, en ton `danger`, et résumée
          par la taille du journal — ce qu'on veut savoir avant d'en
          supprimer une tranche. */}
      {canPurge && (
        <CollapsibleSection
          id="purge-journal"
          title={logs("purge-title")}
          description={logs("purge-description")}
          tone="danger"
          summary={
            <Pill tone="neutral">
              {logs("entries-summary", { count: loggedEntries })}
            </Pill>
          }
        >
          <AdminLogsPurge />
        </CollapsibleSection>
      )}
    </div>
  );
}
