import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { getTranslations } from "next-intl/server";
import { EquipmentReferenceEditor } from "@/components/admin-equipment-editor";
import { ShopReferenceEditor } from "@/components/admin-shop-editor";
import { EventsReferenceEditor } from "@/components/admin-events-editor";
import {
  getCombatReferenceRows,
  getCombatSecondaryBase,
  getCombatStarIncrements,
  getExpeditionReferenceRows,
  getExpeditionSecondaryBase,
  getExpeditionStarIncrements,
} from "@/lib/reference-equipment-server";
import { ProgressionEditor } from "@/components/admin-progression-editor";
import { getLevelUpParameters } from "@/lib/admin-formulas-server";
import { getConsumableCatalog } from "@/lib/consumables-server";
import { getEventsCatalog } from "@/lib/events-server";
import { toolUsingReference } from "@/lib/admin-tool-sources";

export default async function EditReferentielPage({
  params,
}: PageProps<"/admin/referentiels/[id]">) {
  await requireCapability("references.write");
  const [t, names] = await Promise.all([
    getTranslations("admin.referentiels"),
    getTranslations(),
  ]);
  const { id } = await params;
  if (id === "reference-level-up") {
    return (
      <ProgressionEditor
        initial={await getLevelUpParameters()}
        backHref="/admin/referentiels"
        backLabel={t("title")}
        title={t("reference-level-up")}
      />
    );
  }
  if (
    id === "reference-combat-equipment" ||
    id === "reference-expedition-equipment"
  ) {
    const combat = id === "reference-combat-equipment";
    // Bloc 119: the cross-link chip names the tool this reference feeds,
    // from the same mapping the two list screens read.
    const tool = toolUsingReference(
      combat ? "combat-equipment" : "expedition-equipment",
    );
    const usedByTool = tool
      ? { label: names(`${tool}.name`), href: "/admin/tools" }
      : undefined;
    if (combat) {
      const secondary = await getCombatSecondaryBase();
      return (
        <EquipmentReferenceEditor
          variant="combat"
          initialRows={await getCombatReferenceRows()}
          secondaryInitial={{
            rows: [
              { key: "mergeCost", base: secondary.mergeCost },
              { key: "gemSlots", base: secondary.gemSlots },
              { key: "skydust", base: secondary.skydust },
            ],
            labels: secondary.labels ?? {},
          }}
          incrementsInitial={await getCombatStarIncrements()}
          backHref="/admin/referentiels"
          backLabel={t("title")}
          title={t("reference-combat")}
          usedByTool={usedByTool}
        />
      );
    }
    const secondary = await getExpeditionSecondaryBase();
    return (
      <EquipmentReferenceEditor
        variant="expedition"
        initialRows={await getExpeditionReferenceRows()}
        secondaryInitial={{
          rows: [
            { key: "mergeCost", base: secondary.mergeCost },
            { key: "dismantle", base: secondary.dismantle },
          ],
          labels: secondary.labels ?? {},
        }}
        incrementsInitial={await getExpeditionStarIncrements()}
        backHref="/admin/referentiels"
        backLabel={t("title")}
        title={t("reference-expedition")}
        usedByTool={usedByTool}
      />
    );
  }
  if (id === "reference-consommables") {
    return (
      <ShopReferenceEditor
        initialCatalog={await getConsumableCatalog()}
        backHref="/admin/referentiels"
        backLabel={t("title")}
        title={t("reference-consommables")}
      />
    );
  }
  if (id === "reference-events") {
    return (
      <EventsReferenceEditor
        initialCatalog={await getEventsCatalog()}
        backHref="/admin/referentiels"
        backLabel={t("title")}
        title={t("reference-events")}
      />
    );
  }
  notFound();
}
