import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import {
  CityParametersEditor,
  DemoAttackTroopsEditor,
  GemParametersEditor,
  XpGainRateEditor,
} from "@/components/admin-tool-editors";
import { TemplarsEditor } from "@/components/admin-templars-editor";
import { RankingAdminEditor } from "@/components/admin-ranking-editor";
import {
  getCityParameters,
  getDemoPercentages,
  getGemParameters,
  getTemplarParameters,
  getXpGainTiers,
} from "@/lib/admin-formulas-server";
import { toolsSharingEditor } from "@/lib/admin-tool-sources";
import { getTemplarPresentation } from "@/lib/templars-presentation-server";
import { getRankingLadder } from "@/lib/ranking";

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
  const [t, references, names] = await Promise.all([
    getTranslations("admin.tools"),
    getTranslations("admin.referentiels"),
    getTranslations(),
  ]);
  // Bloc 125 §8: a screen is named after the thing it edits, with the name
  // the rest of the site already uses for it — "Outils / Templiers", not
  // "Outils / Paramètres de coût des Templiers". Each screen used to carry a
  // second, longer phrase of its own, so the same reference was called two
  // different things depending on which table you came from, and some of
  // them started with a verb while others did not.
  // Bloc 35/7.1, updated Bloc 50, generalised Bloc 119: the shared edit points
  // (Templiers, Gemmes) are reached from either table, and the ?from query
  // param — set by adminToolEditHref per the slug that linked here — says
  // which one. A references_manager (references.write but not
  // calculators.read) always arrives with from=referentiels, so the role check
  // only matters as a fallback for a link without it.
  const cameFromReferences =
    from === "referentiels" || !can(session.user.role, "calculators.read");
  const backHref = cameFromReferences ? "/admin/referentiels" : "/admin/tools";
  const backLabel = cameFromReferences ? references("title") : t("title");

  if (id === "city-parameters") {
    return (
      <CityParametersEditor
        initial={await getCityParameters()}
        backHref={backHref}
        backLabel={backLabel}
        title={t("city-parameters")}
        // The three Villes tools share this screen; the list is computed from
        // the same mapping the Outils table reads (lib/admin-tool-sources).
        sharedTools={toolsSharingEditor("/admin/tools/city-parameters").map(
          (slug) => ({
            label: names(`${slug}.name`),
            href: "/admin/tools",
          }),
        )}
      />
    );
  }
  if (id === "ranking") {
    return (
      <RankingAdminEditor
        initialLadder={await getRankingLadder()}
        backHref={backHref}
        backLabel={backLabel}
        title={names("ranking.name")}
      />
    );
  }
  if (id === "templars") {
    // Bloc 66/B: the presentation catalog (Image/Nom/Description/Base
    // Temple/Bonus behind the public tile section) shares this edit point too.
    // Bloc 119: and now its save, in one transaction with the cost formula.
    return (
      <TemplarsEditor
        initialParameters={await getTemplarParameters()}
        initialPresentation={await getTemplarPresentation()}
        backHref={backHref}
        backLabel={backLabel}
        title={references("references.templiers")}
      />
    );
  }
  if (id === "xp-gain-rate") {
    return (
      <XpGainRateEditor
        initial={await getXpGainTiers()}
        backHref={backHref}
        backLabel={backLabel}
        title={names("xp-gain-rate.name")}
      />
    );
  }
  if (id === "demo-attack-troops") {
    return (
      <DemoAttackTroopsEditor
        initial={await getDemoPercentages()}
        backHref={backHref}
        backLabel={backLabel}
        title={names("demo-attack-troops.name")}
      />
    );
  }
  if (id === "gems") {
    return (
      <GemParametersEditor
        initial={await getGemParameters()}
        backHref={backHref}
        backLabel={backLabel}
        title={references("references.gemmes")}
      />
    );
  }
  // Every other tool has no named numeric parameter to edit (cdc section 8):
  // the admin table doesn't link here for them, so this is defensive.
  notFound();
}
