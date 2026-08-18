import { GuideMarkdown } from "@/components/guide-markdown";
import { defaultFrenchLegalNotice, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";

export default async function LegalPage() {
  const legalNotice = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  return (
    <main className="public-main">
      <p className="eyebrow">Informations</p>
      <h1>Mentions légales</h1>
      <GuideMarkdown
        markdown={
          localizedText(legalNotice?.content, "fr") || defaultFrenchLegalNotice
        }
      />
    </main>
  );
}
