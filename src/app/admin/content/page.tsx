import { getTranslations } from "next-intl/server";
import { hiddenPublicLocales } from "@/lib/locale-settings";
import { requireCapability } from "@/auth/require-session";
import { AdminLegalEditor } from "@/components/admin-legal-editor";
import { PageHeader } from "@/components/admin-page-header";
import { defaultLegalNoticeContent, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import {
  launchLocales,
  launchRecord,
  translationRecord,
} from "@/lib/translations";

export default async function StaticContentAdminPage() {
  await requireCapability("content.read");
  const [t, languages, hiddenLocales] = await Promise.all([
    getTranslations("admin.content"),
    // Named where the Configuration screen names them (Bloc 119): one list of
    // language names for the whole admin.
    getTranslations("admin.config.languages"),
    hiddenPublicLocales(),
  ]);
  const legalNotice = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  const content = translationRecord(legalNotice?.content);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("page-title")} />
      <AdminLegalEditor
        hiddenLocales={hiddenLocales}
        publicHref="/legal"
        languageNames={Object.fromEntries(
          launchLocales.map((code) => [
            code,
            languages.has(code) ? languages(code) : code.toUpperCase(),
          ]),
        )}
        initialContent={launchRecord(
          (locale) =>
            content[locale] ||
            (locale === "fr" || locale === "en"
              ? defaultLegalNoticeContent[locale]
              : ""),
        )}
      />
    </div>
  );
}
