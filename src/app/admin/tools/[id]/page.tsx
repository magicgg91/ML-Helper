import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import {
  CityParametersEditor,
  DemoAttackTroopsEditor,
  GemParametersEditor,
  TemplarParametersEditor,
  XpGainRateEditor,
} from "@/components/named-parameters-editor";
import { RankingAdminEditor } from "@/components/ranking-admin-editor";
import {
  getCityParameters,
  getDemoPercentages,
  getGemParameters,
  getTemplarParameters,
  getXpGainTiers,
} from "@/lib/admin-formulas-server";
import { getRankingConfig } from "@/lib/ranking";
import { getTranslations } from "next-intl/server";

export default async function EditToolPage({
  params,
}: PageProps<"/admin/tools/[id]">) {
  await requireCapability("calculators.write");
  const { id } = await params;
  const t = await getTranslations("admin.tools");
  let content: React.ReactNode;
  let title: string;
  if (id === "city-parameters") {
    title = t("city-parameters");
    content = <CityParametersEditor initial={await getCityParameters()} />;
  } else if (id === "ranking") {
    title = t("ranking-editor");
    content = <RankingAdminEditor initialConfig={await getRankingConfig()} />;
  } else if (id === "templars") {
    title = t("templar-parameters");
    content = (
      <TemplarParametersEditor initial={await getTemplarParameters()} />
    );
  } else if (id === "xp-gain-rate") {
    title = t("xp-gain-rate-editor");
    content = <XpGainRateEditor initial={await getXpGainTiers()} />;
  } else if (id === "demo-attack-troops") {
    title = t("demo-attack-troops-editor");
    content = <DemoAttackTroopsEditor initial={await getDemoPercentages()} />;
  } else if (id === "gems") {
    title = t("gems-editor");
    content = <GemParametersEditor initial={await getGemParameters()} />;
  } else {
    // Every other tool has no named numeric parameter to edit (cdc section
    // 8): the admin table doesn't link here for them, so this is defensive.
    notFound();
  }
  return (
    <main className="admin-main">
      <h1>{title}</h1>
      {content}
    </main>
  );
}
