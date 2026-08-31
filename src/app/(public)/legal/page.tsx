import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { defaultLegalNoticeContent, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";
import { languageAlternates } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    title: t("legal"),
    description: t("descriptions.legal"),
    alternates: { languages: languageAlternates("/legal") },
  };
}

export default async function LegalPage() {
  const [legalNotice, locale] = await Promise.all([
    prisma.staticContent.findUnique({ where: { key: legalNoticeKey } }),
    getLocale(),
  ]);
  return (
    <main className="public-main">
      <MarkdownRenderer
        markdown={localizedText(
          legalNotice?.content ?? defaultLegalNoticeContent,
          locale,
        )}
      />
    </main>
  );
}
