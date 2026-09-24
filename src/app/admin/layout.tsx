import "./admin.css";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/options";
import { can } from "@/auth/permissions";
import { isAdminRole } from "@/auth/roles";
import { AdminShell } from "@/components/admin-shell";
import { referenceToolSlugs } from "@/lib/admin-tools";
import {
  countLegalNoticePlaceholders,
  defaultFrenchLegalNotice,
  legalNoticeKey,
} from "@/lib/legal-notice";
import { prisma } from "@/lib/prisma";
import { translationRecord } from "@/lib/translations";

// Bloc 42/J: the admin section's own title/description (previously the
// site-wide root default, applied to every public page too) plus noindex —
// an admin login/dashboard has no organic-search value and shouldn't be
// crawled or indexed at all.
// Codex review (PR #68): a static, English-only description is wrong for
// an admin whose active locale is anything else — generateMetadata (not a
// bare `export const metadata`) lets it follow the active locale, same as
// every real page's own metadata already does.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public");
  return {
    // Bloc 91/E2: `absolute` opts the (noindex) admin area out of the public
    // "%s | ML-Helper · Million Lords" title template introduced on the root
    // layout, which would otherwise double-brand it as
    // "ML-Helper Administration | ML-Helper · Million Lords".
    title: { absolute: `ML-Helper ${t("admin")}` },
    description: t("descriptions.admin"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminRole(session.user.role)) return children;
  const role = session.user.role;
  // Bloc 119: the counters of the side column. Each one is read only when the
  // role may see the section it belongs to — a Gestion Guides account must
  // not learn how many users exist from a badge on a link it cannot open.
  const [account, tools, referentiels, guides, users, legalNotice] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { totpEnabled: true },
      }),
      can(role, "calculators.read")
        ? prisma.calculator.count({
            where: { slug: { notIn: [...referenceToolSlugs] } },
          })
        : Promise.resolve(undefined),
      can(role, "references.read")
        ? prisma.calculator.count({
            where: { slug: { in: [...referenceToolSlugs] } },
          })
        : Promise.resolve(undefined),
      can(role, "guides.read")
        ? prisma.guide.count()
        : Promise.resolve(undefined),
      can(role, "users.read")
        ? prisma.user.count()
        : Promise.resolve(undefined),
      can(role, "content.read")
        ? prisma.staticContent.findUnique({ where: { key: legalNoticeKey } })
        : Promise.resolve(null),
    ]);

  // The badge counts the French notice: it is the reference language the
  // others are translated from, so a field left blank there is blank
  // everywhere (Bloc 119 §3, "Pages légales incomplètes").
  const french =
    translationRecord(legalNotice?.content).fr || defaultFrenchLegalNotice;

  return (
    <AdminShell
      role={role}
      username={session.user.name ?? session.user.id}
      totpEnabled={account?.totpEnabled ?? false}
      counts={{
        tools,
        referentiels,
        guides,
        users,
        legalPlaceholders: can(role, "content.read")
          ? countLegalNoticePlaceholders(french)
          : undefined,
      }}
    >
      {children}
    </AdminShell>
  );
}
