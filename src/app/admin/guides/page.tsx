import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";
import { referenceToolSlugs } from "@/lib/admin-tools";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const [t, locale] = await Promise.all([
    getTranslations("admin.guides"),
    getLocale(),
  ]);
  const [guides, references] = await Promise.all([
    prisma.guide.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.calculator.findMany({ where: { slug: { in: [...referenceToolSlugs] } }, orderBy: { slug: "asc" } }),
  ]);
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
      {guides.length || references.length ? (
        <GuideStatusList
          rows={[...guides.map((guide) => ({
            id: guide.id,
            slug: guide.slug,
            title: localizedText(guide.title, locale),
            author: guide.author,
            createdAt: guide.createdAt.toLocaleDateString(locale),
            updatedAt: guide.updatedAt.toLocaleDateString(locale),
            status: guide.status,
            active: guide.active,
            type: "guide" as const,
          })), ...references.map((reference) => ({ id: reference.slug, slug: reference.slug, title: reference.slug === "combat-equipment" ? "Équipements de Combat" : "Équipement d’Expédition", author: "—", createdAt: "—", updatedAt: "—", status: "reference", active: reference.active, type: "reference" as const, editHref: `/admin/guides/reference-${reference.slug}` }))]}
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
