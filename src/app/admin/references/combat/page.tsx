import { requireCapability } from "@/auth/require-session";
import { CombatReferenceAdmin } from "@/components/reference-admin-editors";
import { getCombatReferenceRows } from "@/lib/reference-equipment-server";

export default async function CombatReferencesAdminPage() {
  await requireCapability("references.write");
  return (
    <main>
      <h1>Référentiel — Équipements de Combat</h1>
      <CombatReferenceAdmin initialRows={await getCombatReferenceRows()} />
    </main>
  );
}
