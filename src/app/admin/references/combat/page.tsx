import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth/require-session";
import { CombatReferenceAdmin } from "@/components/combat-reference-admin";
import { getEditableCombatRows } from "@/lib/reference-equipment-server";

export default async function CombatReferencesAdminPage() {
  const session = await requireAdminSession();
  if (
    !["super_admin", "admin", "calculators_manager"].includes(session.user.role)
  )
    redirect("/admin");
  return (
    <main>
      <h1>Référentiel — Équipements de Combat</h1>
      <CombatReferenceAdmin initialRows={await getEditableCombatRows()} />
    </main>
  );
}
