import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const [t, locale] = await Promise.all([
    getTranslations("admin.guides"),
    getLocale(),
  ]);
  const guides = await prisma.guide.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <div className="admin-section-heading">
        <p>{t("description")}</p>
        {can(session.user.role, "guides.write") && (
          <Link className="primary-action" href="/admin/guides/new">
            {t("new")}
          </Link>
        )}
      </div>
      {guides.length ? (
        <GuideStatusList
          rows={guides.map((guide) => ({
            id: guide.id,
            slug: guide.slug,
            title: localizedText(guide.title, locale),
            author: guide.author,
            createdAt: guide.createdAt.toLocaleDateString(locale),
            updatedAt: guide.updatedAt.toLocaleDateString(locale),
            status: guide.status,
            active: guide.active,
          }))}
          canPublish={can(session.user.role, "guides.publish")}
          canDelete={can(session.user.role, "guides.delete")}
          canWrite={can(session.user.role, "guides.write")}
        />
      ) : (
        <p className="admin-empty">{t("empty")}</p>
      )}
    </main>
  );
}
