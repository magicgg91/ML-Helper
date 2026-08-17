import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/auth/require-session";
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdminSession();
  const t = await getTranslations("Admin");
  return (
    <>
      <header>
        <strong>{t("title")}</strong>
        <nav>
          <Link href="/admin">{t("dashboard")}</Link>
          {["super_admin", "admin", "calculators_manager"].includes(
            session.user.role,
          ) && <Link href="/admin/calculators/ranking">Classement</Link>}
          {session.user.role === "super_admin" && (
            <>
              <Link href="/admin/users">{t("users")}</Link>
              <Link href="/admin/logs">{t("logs")}</Link>
            </>
          )}
        </nav>
      </header>
      {children}
    </>
  );
}
