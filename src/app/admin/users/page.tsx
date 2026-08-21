import { getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/users-manager";
export default async function UsersPage() {
  const session = await requireCapability("users.read");
  const t = await getTranslations("admin.users");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  });
  return (
    <main>
      <h1>{t("title")}</h1>
      <UsersManager
        users={users}
        canManage={can(session.user.role, "users.manage")}
      />
    </main>
  );
}
