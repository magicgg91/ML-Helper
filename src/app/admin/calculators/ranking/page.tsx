import { requireCapability } from "@/auth/require-session";
import { RankingAdminEditor } from "@/components/ranking-admin-editor";
import { getRankingConfig } from "@/lib/ranking";

export default async function RankingAdminPage() {
  await requireCapability("calculators.write");
  return (
    <main>
      <h1>Classement</h1>
      <RankingAdminEditor initialConfig={await getRankingConfig()} />
    </main>
  );
}
