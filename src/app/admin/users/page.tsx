import { getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { roles } from "@/auth/roles";
import { requireCapability } from "@/auth/require-session";
import { PageHeader } from "@/components/admin-page-header";
import {
  AdminUsersList,
  type AdminUserRow,
} from "@/components/admin-users-list";
import { roleSectionSummary } from "@/lib/admin-sections";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const session = await requireCapability("users.read");
  const [t, navigation] = await Promise.all([
    getTranslations("admin.users"),
    getTranslations("admin.navigation"),
  ]);
  const users: AdminUserRow[] = await prisma.user.findMany({
    select: { id: true, username: true, role: true, active: true },
    orderBy: { username: "asc" },
  });

  /**
   * Bloc 119 §3: the one-line description under each role is computed from
   * the permission matrix, not written by hand — which is what keeps the
   * difference between Admin and Super Admin true as the matrix moves.
   */
  const roleDescriptions = Object.fromEntries(
    roles.map((role) => {
      const { writable, readable } = roleSectionSummary(role);
      const names = (keys: string[]) =>
        keys.map((key) => navigation(key)).join(", ");
      if (writable.length === 0)
        return [role, t("role-read-only", { sections: names(readable) })];
      const sentences = [t("role-writes", { sections: names(writable) })];
      if (readable.length > 0)
        sentences.push(t("role-reads", { sections: names(readable) }));
      return [role, sentences.join(" ")];
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
      />
      <AdminUsersList
        rows={users}
        currentUserId={session.user.id}
        roleDescriptions={roleDescriptions}
        canManage={can(session.user.role, "users.manage")}
      />
    </div>
  );
}
