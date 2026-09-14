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
import { TemplarsPresentationEditor } from "@/components/templars-presentation-editor";
import { RankingAdminEditor } from "@/components/ranking-admin-editor";
import {
  getCityParameters,
  getDemoPercentages,
  getGemParameters,
  getTemplarParameters,
  getXpGainTiers,
} from "@/lib/admin-formulas-server";
import { getTemplarPresentation } from "@/lib/templars-presentation-server";
import { getRankingConfig } from "@/lib/ranking";
import { getTranslations } from "next-intl/server";

export default async function EditToolPage({
  params,
  searchParams,
}: PageProps<"/admin/tools/[id]">) {
  const { id } = await params;
  const { from } = await searchParams;
  // Templars' formula parameters are also the "Templiers" Référentiels
  // reference (cdc section 6, décision Bloc 3; renamed Bloc 66/A), and Gems' are
  // also the "Gemmes" Référentiels reference (Bloc 36/A) — a
  // references_manager reaching either editor from the Référentiels admin
  // table has references.write but not calculators.write, so these two
  // destinations accept either.
  const session = await requireCapability(
    id === "templars" || id === "gems"
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
    // Bloc 66/B: the presentation catalog (Image/Nom/Description/Base
    // Temple/Bonus behind the public tile section) shares this edit point
    // too — one more consumer of the templars/gems dual-capability check
    // above, alongside the cost formula. It renders with no
    // EditorActionBar of its own (see its own comment): the formula
    // editor's bar below already carries the page's one back link.
    content = (
      <>
        <TemplarParametersEditor
          initial={await getTemplarParameters()}
          // Bloc 35/7.1, updated Bloc 50: this edit point is shared between
          // the "templars" tool row (Tools) and the "templiers" reference row
          // (Référentiels) — the ?from query param (set by adminToolEditHref
          // per the slug that linked here) says which table the admin
          // actually opened it from, so "Retour" goes back there. A
          // references_manager (references.write but not calculators.read)
          // always arrives with from=referentiels, so the role check only
          // matters as a fallback for a link without it.
          backHref={
            from === "referentiels"
              ? "/admin/referentiels"
              : can(session.user.role, "calculators.read")
                ? "/admin/tools"
                : "/admin/referentiels"
          }
        />
        <TemplarsPresentationEditor
          initialCatalog={await getTemplarPresentation()}
        />
      </>
    );
  } else if (id === "xp-gain-rate") {
    title = t("xp-gain-rate-editor");
    content = <XpGainRateEditor initial={await getXpGainTiers()} />;
  } else if (id === "demo-attack-troops") {
    title = t("demo-attack-troops-editor");
    content = <DemoAttackTroopsEditor initial={await getDemoPercentages()} />;
  } else if (id === "gems") {
    title = t("gems-editor");
    content = (
      <GemParametersEditor
        initial={await getGemParameters()}
        // Bloc 36/A, updated Bloc 50: same contextual back button as
        // Templars — carries provenance via ?from=referentiels (set by
        // adminToolEditHref for the "gemmes" reference row) so "Retour"
        // returns to Référentiels, not Tools, for this same shared edit
        // point.
        backHref={
          from === "referentiels"
            ? "/admin/referentiels"
            : can(session.user.role, "calculators.read")
              ? "/admin/tools"
              : "/admin/referentiels"
        }
      />
    );
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
