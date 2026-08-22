import "./admin.css";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/options";
import { isAdminRole } from "@/auth/roles";
import { getAvailableLocales } from "@/i18n/config";
import { LocaleToggle } from "@/components/locale-toggle";
import { AdminNav } from "@/components/admin-nav";
import { AdminAccountMenu } from "@/components/admin-account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("admin");
  if (!session?.user || !isAdminRole(session.user.role)) return children;
  const [account, locales] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totpEnabled: true },
    }),
    getAvailableLocales(),
  ]);
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
          <LocaleToggle locales={locales} />
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
