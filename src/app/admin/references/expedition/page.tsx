import { requireCapability } from "@/auth/require-session";
import { ExpeditionReferenceAdmin } from "@/components/reference-admin-editors";
import { getExpeditionReferenceRows } from "@/lib/reference-equipment-server";
import { getTranslations } from "next-intl/server";

export default async function ExpeditionReferencesAdminPage() {
  await requireCapability("references.write");
  const [t, equipment] = await Promise.all([
    getTranslations("admin.references"),
    getTranslations("expedition-equipment"),
  ]);
  return (
    <main>
      <h1>{t("page-title", { name: equipment("name") })}</h1>
      <ExpeditionReferenceAdmin
        initialRows={await getExpeditionReferenceRows()}
      />
    </main>
  );
}
