import { getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import {
  AdminLanguagesPanel,
  type LanguageRow,
} from "@/components/admin-languages-panel";
import { PageHeader } from "@/components/admin-page-header";
import { Pill } from "@/components/admin-pill";
import { AdminSettingsSection } from "@/components/admin-settings-section";
import { TrackingSettingsPanel } from "@/components/tracking-settings-panel";
import {
  alwaysActiveLocales,
  getLocaleActiveState,
  isAlwaysActiveLocale,
} from "@/lib/locale-settings";
import { prisma } from "@/lib/prisma";
import { getTrackingSettings } from "@/lib/site-settings";
import { hasLocalizedText, launchLocales } from "@/lib/translations";

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
  const [t, state, tracking, guides] = await Promise.all([
    getTranslations("admin.config"),
    getLocaleActiveState(),
    getTrackingSettings(),
    // Bloc 119: how many guides are written in each language — the column
    // that makes the visibility switch answerable rather than blind.
    prisma.guide.findMany({ select: { content: true } }),
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
      />
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
