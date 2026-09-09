import { requireCapability } from "@/auth/require-session";
import { LegalNoticeEditor } from "@/components/legal-notice-editor";
import { defaultLegalNoticeContent, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { launchRecord, translationRecord } from "@/lib/translations";
import { getTranslations } from "next-intl/server";

export default async function StaticContentAdminPage() {
  await requireCapability("content.read");
  const t = await getTranslations("admin.content");
  const legalNotice = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  const content = translationRecord(legalNotice?.content);
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <LegalNoticeEditor
        initialContent={launchRecord(
          (locale) =>
            content[locale] ||
            (locale === "fr" || locale === "en"
              ? defaultLegalNoticeContent[locale]
              : ""),
        )}
      />
    </main>
  );
}
