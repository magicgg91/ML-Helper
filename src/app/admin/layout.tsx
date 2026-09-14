import "./admin.css";
import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/options";
import { isAdminRole } from "@/auth/roles";
import { AdminLocaleToggle } from "@/components/admin-locale-toggle";
import { AdminNav } from "@/components/admin-nav";
import { AdminAccountMenu } from "@/components/admin-account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

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
  const t = await getTranslations("admin");
  if (!session?.user || !isAdminRole(session.user.role)) return children;
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true },
  });
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <strong className="text-sm">{t("title")}</strong>
          <AdminNav role={session.user.role} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" target="_blank" rel="noopener noreferrer">
              {t("view-site")}
              <ExternalLinkIcon aria-hidden="true" />
            </Link>
          </Button>
          <AdminLocaleToggle />
          <ThemeToggle />
          <AdminAccountMenu
            username={session.user.name ?? session.user.id}
            totpEnabled={account?.totpEnabled ?? false}
          />
        </div>
      </header>
      {children}
    </>
  );
}
