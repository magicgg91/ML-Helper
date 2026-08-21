import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SetupSuperAdminForm } from "@/components/setup-superadmin-form";
import { hasSuperAdmin } from "@/services/setup-superadmin";
import { getTranslations } from "next-intl/server";

export default async function SetupPage() {
  await connection();
  if (await hasSuperAdmin()) redirect("/login");
  const t = await getTranslations("admin.setup");
  return (
    <main className="admin-main setup-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <SetupSuperAdminForm />
    </main>
  );
}
