import { requireCapability } from "@/auth/require-session";
import { TemplarReferenceAdmin } from "@/components/reference-admin-editors";
import { getTemplarCostRows } from "@/lib/reference-equipment-server";

export default async function TemplarReferencesAdminPage() {
  await requireCapability("references.write");
  return (
    <main>
      <h1>Référentiel — Templiers</h1>
      <TemplarReferenceAdmin initialCosts={await getTemplarCostRows()} />
    </main>
  );
}
