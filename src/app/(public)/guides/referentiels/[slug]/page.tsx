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

export default async function ReferencePage({
  params,
}: PageProps<"/guides/referentiels/[slug]">) {
  const { slug } = await params;
  const reference = referenceCatalog.find((item) => item.slug === slug);
  if (!reference) notFound();
  const active = await getCalculatorAvailability();
  const t = await getTranslations("GuidesHub");

  return (
    <main className="public-main">
      <p className="eyebrow">{t("referencesTitle")}</p>
      <h1>{t(reference.slug)}</h1>
      {active[reference.calculatorSlug] ? (
        slug === "combat-equipment" ? (
          <CombatReferenceTable rows={await getCombatReferenceRows()} />
        ) : (
          <ExpeditionReferenceTable rows={await getExpeditionReferenceRows()} />
        )
      ) : (
        <p className="empty-state">{t("unavailable")}</p>
      )}
    </main>
  );
}
