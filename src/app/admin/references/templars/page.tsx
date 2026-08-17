import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth/require-session";
import { TemplarReferenceAdmin } from "@/components/reference-admin-editors";
import { getTemplarCostRows } from "@/lib/reference-equipment-server";

export default async function TemplarReferencesAdminPage() {
  const session = await requireAdminSession();
  if (
    !["super_admin", "admin", "calculators_manager"].includes(session.user.role)
  )
    redirect("/admin");
  return (
    <main>
      <h1>Référentiel — Templiers</h1>
      <TemplarReferenceAdmin initialCosts={await getTemplarCostRows()} />
    </main>
  );
}
