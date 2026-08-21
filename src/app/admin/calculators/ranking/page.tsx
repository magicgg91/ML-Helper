import { requireCapability } from "@/auth/require-session";
import { RankingAdminEditor } from "@/components/ranking-admin-editor";
import { getRankingConfig } from "@/lib/ranking";
import { getTranslations } from "next-intl/server";

export default async function RankingAdminPage() {
  await requireCapability("calculators.write");
  const t = await getTranslations("admin.ranking");
  return (
    <main>
      <h1>{t("title")}</h1>
      <RankingAdminEditor initialConfig={await getRankingConfig()} />
    </main>
  );
}
