import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
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
  searchParams,
}: PageProps<"/admin/tools/[id]">) {
  const { id } = await params;
  const { from } = await searchParams;
  // Templars' formula parameters are also the "Coût des Templiers" Guides
  // reference (cdc section 6, décision Bloc 3): a guides_manager reaching
  // this same editor from the Guides admin table has references.write but
  // not calculators.write, so this one destination accepts either.
  const session = await requireCapability(
    id === "templars"
      ? (["calculators.write", "references.write"] as const)
      : "calculators.write",
  );
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
      <TemplarParametersEditor
        initial={await getTemplarParameters()}
        // Bloc 35/7.1: this edit point is shared between the "templars"
        // tool row (Tools) and the "templiers" reference row (Guides) — the
        // ?from query param (set by adminToolEditHref per the slug that
        // linked here) says which table the admin actually opened it from,
        // so "Retour" goes back there. A guides_manager (references.write
        // but not calculators.read) always arrives with from=guides, so the
        // role check only matters as a fallback for a link without it.
        backHref={
          from === "guides"
            ? "/admin/guides"
            : can(session.user.role, "calculators.read")
              ? "/admin/tools"
              : "/admin/guides"
        }
      />
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
