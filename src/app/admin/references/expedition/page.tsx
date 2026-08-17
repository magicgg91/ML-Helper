import { requireCapability } from "@/auth/require-session";
import { ExpeditionReferenceAdmin } from "@/components/reference-admin-editors";
import { getExpeditionReferenceRows } from "@/lib/reference-equipment-server";

export default async function ExpeditionReferencesAdminPage() {
  await requireCapability("references.write");
  return (
    <main>
      <h1>Référentiel — Équipement d’Expédition</h1>
      <ExpeditionReferenceAdmin
        initialRows={await getExpeditionReferenceRows()}
      />
    </main>
  );
}
