import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { getTranslations } from "next-intl/server";
import {
  CombatReferenceScreen,
  ExpeditionReferenceScreen,
} from "@/components/reference-admin-editors";
import { ConsumablesReferenceScreen } from "@/components/consumables-admin-editor";
import {
  getCombatGemSlotsBase,
  getCombatMergeCostBase,
  getCombatReferenceRows,
  getCombatSkydustBase,
  getExpeditionDismantleBase,
  getExpeditionMergeCostBase,
  getExpeditionReferenceRows,
  getExpeditionStarIncrements,
} from "@/lib/reference-equipment-server";
import { LevelUpParametersEditor } from "@/components/named-parameters-editor";
import { getLevelUpParameters } from "@/lib/admin-formulas-server";
import {
  getConsumableCatalog,
  getConsumablesIntro,
} from "@/lib/consumables-server";

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
            skydustInitial={await getCombatSkydustBase()}
            gemSlotsInitial={await getCombatGemSlotsBase()}
            mergeCostInitial={await getCombatMergeCostBase()}
          />
        ) : (
          <ExpeditionReferenceScreen
            initialRows={await getExpeditionReferenceRows()}
            incrementsInitial={await getExpeditionStarIncrements()}
            mergeCostInitial={await getExpeditionMergeCostBase()}
            dismantleInitial={await getExpeditionDismantleBase()}
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
          introInitial={await getConsumablesIntro()}
        />
      </main>
    );
  }
  notFound();
}
