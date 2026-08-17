import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/auth/require-session";
import { AdminNav } from "@/components/admin-nav";
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdminSession();
  const t = await getTranslations("Admin");
  return (
    <>
      <header className="admin-header">
        <strong>{t("title")}</strong>
        <span>{session.user.name ?? session.user.id}</span>
      </header>
      <AdminNav role={session.user.role} />
      {children}
    </>
  );
}
