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
import { getTrackingScriptUrl } from "@/lib/site-settings";
import { launchLocales } from "@/lib/translations";

// Bloc 90/A: the Configuration tab is restricted to admin and super_admin —
// requireCapability("configuration.read") renders "Accès interdit" (403) for
// every other role, matching the nav link which is hidden for them too.
export default async function ConfigAdminPage() {
  await requireCapability("configuration.read");
  const [t, state, trackingUrl] = await Promise.all([
    getTranslations("admin.config"),
    getLocaleActiveState(),
    getTrackingScriptUrl(),
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
      <AdminConfigSection
        title={t("tracking.section")}
        description={t("tracking.intro")}
      >
        <TrackingSettingsPanel url={trackingUrl ?? ""} />
      </AdminConfigSection>
    </main>
  );
}
