import { requireCapability } from "@/auth/require-session";
import { TemplarReferenceAdmin } from "@/components/reference-admin-editors";
import { getTemplarCostRows } from "@/lib/reference-equipment-server";
import { getTranslations } from "next-intl/server";

export default async function TemplarReferencesAdminPage() {
  await requireCapability("references.write");
  const [t, templars] = await Promise.all([
    getTranslations("admin.references"),
    getTranslations("templars"),
  ]);
  return (
    <main>
      <h1>{t("page-title", { name: templars("name") })}</h1>
      <TemplarReferenceAdmin initialCosts={await getTemplarCostRows()} />
    </main>
  );
}
