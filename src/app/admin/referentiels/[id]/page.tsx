import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { getTranslations } from "next-intl/server";
import {
  CombatReferenceScreen,
  ExpeditionReferenceScreen,
} from "@/components/reference-admin-editors";
import { ConsumablesReferenceScreen } from "@/components/consumables-admin-editor";
import { EventsReferenceScreen } from "@/components/events-admin-editor";
import {
  getCombatReferenceRows,
  getCombatSecondaryBase,
  getCombatStarIncrements,
  getExpeditionReferenceRows,
  getExpeditionSecondaryBase,
  getExpeditionStarIncrements,
} from "@/lib/reference-equipment-server";
import { LevelUpParametersEditor } from "@/components/named-parameters-editor";
import { getLevelUpParameters } from "@/lib/admin-formulas-server";
import { getConsumableCatalog } from "@/lib/consumables-server";
import { getEventsCatalog } from "@/lib/events-server";

export default async function EditReferentielPage({
  params,
}: PageProps<"/admin/referentiels/[id]">) {
  await requireCapability("references.write");
  const t = await getTranslations("admin.referentiels");
  const { id } = await params;
  if (id === "reference-level-up") {
    return (
      <main className="admin-main">
        {/* Bloc 35/10.2/10.3: LevelUpParametersEditor now carries its own
            EditorActionBar (back link + save), matching every other named
            parameters editor — no separate back link here. */}
        <h1>{t("reference-level-up")}</h1>
        <LevelUpParametersEditor initial={await getLevelUpParameters()} />
      </main>
    );
  }
  if (
    id === "reference-combat-equipment" ||
    id === "reference-expedition-equipment"
  ) {
    const combat = id === "reference-combat-equipment";
    return (
      <main className="admin-main">
        <h1>{combat ? t("reference-combat") : t("reference-expedition")}</h1>
        {combat ? (
          <CombatReferenceScreen
            initialRows={await getCombatReferenceRows()}
            secondaryInitial={await getCombatSecondaryBase()}
            incrementsInitial={await getCombatStarIncrements()}
          />
        ) : (
          <ExpeditionReferenceScreen
            initialRows={await getExpeditionReferenceRows()}
            incrementsInitial={await getExpeditionStarIncrements()}
            secondaryInitial={await getExpeditionSecondaryBase()}
          />
        )}
      </main>
    );
  }
  if (id === "reference-consommables") {
    return (
      <main className="admin-main">
        <h1>{t("reference-consommables")}</h1>
        <ConsumablesReferenceScreen
          initialCatalog={await getConsumableCatalog()}
        />
      </main>
    );
  }
  if (id === "reference-events") {
    return (
      <main className="admin-main">
        <h1>{t("reference-events")}</h1>
        <EventsReferenceScreen initialCatalog={await getEventsCatalog()} />
      </main>
    );
  }
  notFound();
}
