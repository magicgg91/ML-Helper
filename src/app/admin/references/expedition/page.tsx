import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth/require-session";
import { ExpeditionReferenceAdmin } from "@/components/reference-admin-editors";
import { getExpeditionReferenceRows } from "@/lib/reference-equipment-server";

export default async function ExpeditionReferencesAdminPage() {
  const session = await requireAdminSession();
  if (
    !["super_admin", "admin", "calculators_manager"].includes(session.user.role)
  )
    redirect("/admin");
  return (
    <main>
      <h1>Référentiel — Équipement d’Expédition</h1>
      <ExpeditionReferenceAdmin
        initialRows={await getExpeditionReferenceRows()}
      />
    </main>
  );
}
