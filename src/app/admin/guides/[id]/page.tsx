import { notFound } from "next/navigation";
import { requireCapability } from "@/auth/require-session";
import { can } from "@/auth/permissions";
import { GuideEditor } from "@/components/guide-editor";
import { prisma } from "@/lib/prisma";
import { launchRecord, translationRecord } from "@/lib/translations";
import { getTranslations } from "next-intl/server";
import {
  CombatReferenceScreen,
  ExpeditionReferenceScreen,
} from "@/components/reference-admin-editors";
import { ConsumablesReferenceScreen } from "@/components/consumables-admin-editor";
import {
  getCombatGemSlotsBase,
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
  getConsumableRows,
  getConsumablesIntro,
} from "@/lib/consumables-server";
import { parseGuideCategories } from "@/lib/guide-categories";

export default async function EditGuidePage({
  params,
}: PageProps<"/admin/guides/[id]">) {
  const session = await requireCapability("guides.write");
  const t = await getTranslations("admin.guides");
  const { id } = await params;
  if (id === "reference-level-up") {
    await requireCapability("references.write");
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
    await requireCapability("references.write");
    const combat = id === "reference-combat-equipment";
    return (
      <main className="admin-main">
        <h1>{combat ? t("reference-combat") : t("reference-expedition")}</h1>
        {combat ? (
          <CombatReferenceScreen
            initialRows={await getCombatReferenceRows()}
            skydustInitial={await getCombatSkydustBase()}
            gemSlotsInitial={await getCombatGemSlotsBase()}
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
  if (id === "reference-consumables") {
    await requireCapability("references.write");
    return (
      <main className="admin-main">
        <h1>{t("reference-consumables")}</h1>
        <ConsumablesReferenceScreen
          initialRows={await getConsumableRows()}
          introInitial={await getConsumablesIntro()}
        />
      </main>
    );
  }
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();
  const title = translationRecord(guide.title),
    excerpt = translationRecord(guide.excerpt),
    content = translationRecord(guide.content);
  return (
    <main className="admin-main">
      <p className="eyebrow">{t("title")}</p>
      <h1>{t("edit-title")}</h1>
      <GuideEditor
        canPublish={can(session.user.role, "guides.publish")}
        initial={{
          id: guide.id,
          slug: guide.slug,
          category: parseGuideCategories(guide.category),
          coverImage: guide.coverImage ?? "",
          status: guide.status,
          translations: launchRecord((locale) => ({
            title: title[locale] ?? "",
            excerpt: excerpt[locale] ?? "",
            content: content[locale] ?? "",
          })),
        }}
      />
    </main>
  );
}
