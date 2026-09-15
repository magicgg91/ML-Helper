import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import { getTranslations } from "next-intl/server";
import { AdminConfigSection } from "@/components/admin-config-section";
import {
  LanguageSettingsPanel,
  type LanguageRow,
} from "@/components/language-settings-panel";
import { TrackingSettingsPanel } from "@/components/tracking-settings-panel";
import {
  getLocaleActiveState,
  isAlwaysActiveLocale,
} from "@/lib/locale-settings";
import { getTrackingSettings } from "@/lib/site-settings";
import { launchLocales } from "@/lib/translations";

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
  const [t, state, tracking] = await Promise.all([
    getTranslations("admin.config"),
    getLocaleActiveState(),
    getTrackingSettings(),
  ]);
  // Bloc 90/B+D: the 5 launched languages, EN/FR first, each with its public
  // visibility and whether it is locked (always-active EN/FR).
  const order = ["en", "fr", "de", "es", "tr"].filter((locale) =>
    (launchLocales as readonly string[]).includes(locale),
  );
  const rows: LanguageRow[] = order.map((locale) => ({
    locale,
    active: state[locale as keyof typeof state],
    locked: isAlwaysActiveLocale(locale),
  }));
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      {/* Bloc 100/C: every section of this tab is its own collapsible block,
          folded independently of the others — including the ones still to
          come. */}
      <AdminConfigSection
        title={t("languages-section")}
        description={t("intro")}
      >
        <LanguageSettingsPanel rows={rows} />
      </AdminConfigSection>
      {canConfigureScripts && (
        <AdminConfigSection
          title={t("tracking.section")}
          description={t("tracking.intro")}
        >
          <TrackingSettingsPanel
            url={tracking.url ?? ""}
            websiteId={tracking.websiteId ?? ""}
          />
        </AdminConfigSection>
      )}
    </main>
  );
}
