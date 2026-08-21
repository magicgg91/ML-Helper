import { requireCapability } from "@/auth/require-session";
import { LegalNoticeEditor } from "@/components/legal-notice-editor";
import { defaultFrenchLegalNotice, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";
import { getTranslations } from "next-intl/server";

export default async function StaticContentAdminPage() {
  await requireCapability("content.read");
  const t = await getTranslations("admin.content");
  const legalNotice = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <LegalNoticeEditor
        initialContent={
          localizedText(legalNotice?.content, "fr") || defaultFrenchLegalNotice
        }
      />
    </main>
  );
}
