import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { defaultLegalNoticeContent, legalNoticeKey } from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Public"),
    getLocale(),
  ]);
  return pageMetadata({
    locale,
    path: "/legal",
    title: t("legal"),
    description: t("descriptions.legal"),
  });
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
