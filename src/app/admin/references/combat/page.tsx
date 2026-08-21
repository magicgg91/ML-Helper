import { requireCapability } from "@/auth/require-session";
import { CombatReferenceAdmin } from "@/components/reference-admin-editors";
import { getCombatReferenceRows } from "@/lib/reference-equipment-server";
import { getTranslations } from "next-intl/server";

export default async function CombatReferencesAdminPage() {
  await requireCapability("references.write");
  const [t, equipment] = await Promise.all([
    getTranslations("admin.references"),
    getTranslations("combat-equipment"),
  ]);
  return (
    <main>
      <h1>{t("page-title", { name: equipment("name") })}</h1>
      <CombatReferenceAdmin initialRows={await getCombatReferenceRows()} />
    </main>
  );
}
