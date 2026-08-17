import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SetupSuperAdminForm } from "@/components/setup-superadmin-form";
import { hasSuperAdmin } from "@/services/setup-superadmin";

export default async function SetupPage() {
  await connection();
  if (await hasSuperAdmin()) redirect("/login");
  return (
    <main className="admin-main setup-page">
      <p className="eyebrow">Configuration initiale</p>
      <h1>Créer le premier Super Admin</h1>
      <p>
        Ce formulaire n’est disponible qu’une seule fois. Choisis les
        identifiants qui permettront d’administrer ML-Helper.
      </p>
      <SetupSuperAdminForm />
    </main>
  );
}
