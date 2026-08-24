import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { defaultFrenchLegalNotice, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return { title: t("legal") };
}

export default async function LegalPage() {
  const legalNotice = await prisma.staticContent.findUnique({
    where: { key: legalNoticeKey },
  });
  return (
    <main className="public-main">
      <MarkdownRenderer
        markdown={
          localizedText(legalNotice?.content, "fr") || defaultFrenchLegalNotice
        }
      />
    </main>
  );
}
