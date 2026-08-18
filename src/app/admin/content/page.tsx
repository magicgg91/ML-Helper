import { requireCapability } from "@/auth/require-session";
import { LegalNoticeEditor } from "@/components/legal-notice-editor";
import { defaultFrenchLegalNotice, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";

export default async function StaticContentAdminPage() {
  await requireCapability("content.read");
  const legalNotice = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">Page institutionnelle</p>
      <h1>Mentions légales</h1>
      <LegalNoticeEditor
        initialContent={
          localizedText(legalNotice?.content, "fr") || defaultFrenchLegalNotice
        }
      />
    </main>
  );
}
