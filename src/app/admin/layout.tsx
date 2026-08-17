import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/options";
import { isAdminRole } from "@/auth/roles";
import { AdminNav } from "@/components/admin-nav";
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("Admin");
  if (!session?.user || !isAdminRole(session.user.role)) return children;
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
