import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireCapability } from "@/auth/require-session";
import { AdminButton } from "@/components/admin-button";
import {
  AdminGuidesList,
  type AdminGuideRow,
} from "@/components/admin-guides-list";
import { PageHeader } from "@/components/admin-page-header";
import { prisma } from "@/lib/prisma";
import {
  hasLocalizedText,
  launchLocales,
  localizedText,
  type LaunchLocale,
} from "@/lib/translations";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const [t, languages, locale] = await Promise.all([
    getTranslations("admin.guides"),
    // Named where the Configuration screen names them; `has` keeps a sixth
    // language file from throwing before anyone has translated its name.
    getTranslations("admin.config.languages"),
    getLocale(),
  ]);
  const guides = await prisma.guide.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const canWrite = can(session.user.role, "guides.write");

  const rows: AdminGuideRow[] = guides.map((guide) => ({
    id: guide.id,
    slug: guide.slug,
    title: localizedText(guide.title, locale),
    author: guide.author,
    createdAt: guide.createdAt.toISOString(),
    updatedAt: guide.updatedAt.toISOString(),
    status: guide.status,
    // Bloc 55/C: which locales this guide is actually written in — fr/en are
    // always keys (possibly explicitly blank) while de/es/tr only appear once
    // an admin has filled them in, so hasLocalizedText (no English fallback,
    // unlike localizedText above) is the right check for "really written".
    translations: Object.fromEntries(
      launchLocales.map((code) => [
        code,
        hasLocalizedText(guide.content, code),
      ]),
    ) as Record<LaunchLocale, boolean>,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        actions={
          canWrite ? (
            <AdminButton asChild variant="primary">
              <Link href="/admin/guides/new">{t("new-title")}</Link>
            </AdminButton>
          ) : undefined
        }
      />
      <AdminGuidesList
        rows={rows}
        languageNames={Object.fromEntries(
          launchLocales.map((code) => [
            code,
            languages.has(code) ? languages(code) : code.toUpperCase(),
          ]),
        )}
        canWrite={canWrite}
        canPublish={can(session.user.role, "guides.publish")}
        canDelete={can(session.user.role, "guides.delete")}
      />
    </div>
  );
}
