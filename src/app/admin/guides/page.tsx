import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideStatusList } from "@/components/guide-status-list";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  hasLocalizedText,
  launchLocales,
  localizedText,
  type LaunchLocale,
} from "@/lib/translations";
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
  const newHref = can(session.user.role, "guides.write")
    ? "/admin/guides/new"
    : undefined;
  return (
    <main className="admin-main">
      {/* Bloc 55/B: the create action now sits next to the section title,
          instead of on its own row above the table (Bloc 32) — the table's
          own row was left orphaned by the post-Bloc 50 screen rework. */}
      <div className="admin-section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        {newHref && (
          <Link className="editor-action editor-action-primary" href={newHref}>
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
            // Bloc 55/C: which locales this guide is actually written in —
            // fr/en are always keys (possibly explicitly blank) while
            // de/es/tr are only present once an admin has filled them in,
            // so hasLocalizedText (no English fallback, unlike
            // localizedText above) is the right check for "really written".
            languages: Object.fromEntries(
              launchLocales.map((item) => [
                item,
                hasLocalizedText(guide.content, item),
              ]),
            ) as Record<LaunchLocale, boolean>,
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
