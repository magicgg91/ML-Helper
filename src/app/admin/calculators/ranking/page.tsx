import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth/require-session";
import { RankingAdminEditor } from "@/components/ranking-admin-editor";
import { getRankingConfig } from "@/lib/ranking";

export default async function RankingAdminPage() {
  const session = await requireAdminSession();
  if (
    !["super_admin", "admin", "calculators_manager"].includes(session.user.role)
  )
    redirect("/admin");
  return (
    <main>
      <h1>Classement</h1>
      <RankingAdminEditor initialConfig={await getRankingConfig()} />
    </main>
  );
}
