import { getTranslations } from "next-intl/server";
import { requireSuperAdminSession } from "@/auth/require-session";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/users-manager";
export default async function UsersPage() {
  await requireSuperAdminSession();
  const t = await getTranslations("Users");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  });
  return (
    <main>
      <h1>{t("title")}</h1>
      <UsersManager users={users} />
    </main>
  );
}
