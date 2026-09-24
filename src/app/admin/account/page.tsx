import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/auth/require-session";
import { AdminAccountScreen } from "@/components/admin-account-screen";
import { PageHeader } from "@/components/admin-page-header";
import { prisma } from "@/lib/prisma";

/**
 * Bloc 125 §2: every role has an account, so this screen asks for a session
 * and nothing more — `requireAdminSession`, not `requireCapability`. It still
 * goes through the same door as the rest of the admin: the setup redirect,
 * the live-row revalidation that bounces a deactivated account (Bloc 86/E1),
 * and the admin-role check.
 */
export default async function AdminAccountPage() {
  const session = await requireAdminSession();
  const [t, account] = await Promise.all([
    getTranslations("admin"),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totpEnabled: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("navigation.group-access")}
        title={t("account.title")}
        description={t("account.subtitle")}
      />
      <AdminAccountScreen totpEnabled={account?.totpEnabled ?? false} />
    </div>
  );
}
