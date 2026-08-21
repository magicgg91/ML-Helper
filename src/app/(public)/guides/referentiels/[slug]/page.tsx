import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  CombatReferenceTable,
  ExpeditionReferenceTable,
} from "@/components/reference-tables";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { referenceCatalog } from "@/lib/reference-catalog";
import {
  getCombatReferenceRows,
  getExpeditionReferenceRows,
} from "@/lib/reference-equipment-server";
import { LevelUpReference } from "@/components/level-up-reference";
import { getLevelUpParameters } from "@/lib/admin-formulas-server";

export default async function ReferencePage({
  params,
}: PageProps<"/guides/referentiels/[slug]">) {
  const { slug } = await params;
  const reference = referenceCatalog.find((item) => item.slug === slug);
  if (!reference) notFound();
  const active = await getCalculatorAvailability();
  const t = await getTranslations("references");

  return (
    <main className="public-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t(`catalog.${reference.slug}`)}</h1>
      {active[reference.calculatorSlug] ? (
        slug === "combat-equipment" ? (
          <CombatReferenceTable rows={await getCombatReferenceRows()} />
        ) : slug === "level-up" ? (
          <LevelUpReference parameters={await getLevelUpParameters()} />
        ) : (
          <ExpeditionReferenceTable rows={await getExpeditionReferenceRows()} />
        )
      ) : (
        <p className="empty-state">{t("single-unavailable")}</p>
      )}
    </main>
  );
}
