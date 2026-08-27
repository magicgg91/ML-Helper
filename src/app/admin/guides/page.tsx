import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { localizedText } from "@/lib/translations";
import { getLocale, getTranslations } from "next-intl/server";
import {
  adminToolEditHref,
  formulaGuideReferenceSlugs,
  guideReferenceSlugs,
} from "@/lib/admin-tools";

export default async function GuidesAdminPage() {
  const session = await requireCapability("guides.read");
  const [t, locale] = await Promise.all([
    getTranslations("admin.guides"),
    getLocale(),
  ]);
  const [guides, references] = await Promise.all([
    prisma.guide.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.calculator.findMany({
      where: { slug: { in: [...guideReferenceSlugs] } },
      orderBy: { slug: "asc" },
    }),
  ]);
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <div className="admin-section-heading">
        {can(session.user.role, "guides.write") && (
          <Link
            className="editor-action editor-action-primary"
            href="/admin/guides/new"
          >
            {t("new")}
          </Link>
        )}
      </div>
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
            ...references.map((reference) => {
              const isFormulaBased = (
                formulaGuideReferenceSlugs as readonly string[]
              ).includes(reference.slug);
              return {
                id: reference.slug,
                slug: reference.slug,
                title: t(`references.${reference.slug}`),
                author: "—",
                createdAt: "—",
                updatedAt: "—",
                status: "reference",
                active: reference.active,
                type: "reference" as const,
                editHref: isFormulaBased
                  ? adminToolEditHref(reference.slug)
                  : `/admin/guides/reference-${reference.slug}`,
                // Formula-based references (Templars) share their active
                // state with an Outils calculator, toggled there instead
                // (calculators.toggle) — no independent control here.
                canToggle: !isFormulaBased,
              };
            }),
          ]}
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
