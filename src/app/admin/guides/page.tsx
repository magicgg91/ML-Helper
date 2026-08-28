import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";
import { adminToolEditHref, referenceToolSlugs } from "@/lib/admin-tools";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const [t, locale] = await Promise.all([
    getTranslations("admin.guides"),
    getLocale(),
  ]);
  const [guides, references] = await Promise.all([
    prisma.guide.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.calculator.findMany({
      where: { slug: { in: [...referenceToolSlugs] } },
      orderBy: { slug: "asc" },
    }),
  ]);
  const newHref = can(session.user.role, "guides.write")
    ? "/admin/guides/new"
    : undefined;
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      {guides.length || references.length ? (
        <GuideStatusList
          rows={[
            ...guides.map((guide) => ({
              id: guide.id,
              slug: guide.slug,
              title: localizedText(guide.title, locale),
              author: guide.author,
              createdAt: guide.createdAt.toLocaleDateString(locale),
              updatedAt: guide.updatedAt.toLocaleDateString(locale),
              status: guide.status,
              active: guide.active,
              type: "guide" as const,
            })),
            // Bloc 33/G: every reference row (Templiers included) now has
            // its own independent active flag — the same generic toggle
            // (references.write) applies to all of them. Templiers' edit
            // action still points at the shared formula-params editor.
            ...references.map((reference) => ({
              id: reference.slug,
              slug: reference.slug,
              title: t(`references.${reference.slug}`),
              author: "—",
              createdAt: "—",
              updatedAt: "—",
              status: "reference",
              active: reference.active,
              type: "reference" as const,
              editHref:
                adminToolEditHref(reference.slug) ??
                `/admin/guides/reference-${reference.slug}`,
            })),
          ]}
          canPublish={can(session.user.role, "guides.publish")}
          canDelete={can(session.user.role, "guides.delete")}
          canWrite={can(session.user.role, "guides.write")}
          newHref={newHref}
        />
      ) : (
        <div className="admin-section-heading">
          <p className="admin-empty">{t("empty")}</p>
          {newHref && (
            <Link
              className="editor-action editor-action-primary"
              href={newHref}
            >
              {t("new")}
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
