import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import {
  CombatReferenceTable,
  ExpeditionReferenceTable,
} from "@/components/reference-tables";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { referenceCatalog } from "@/lib/reference-catalog";
import {
  getCombatGemSlotsBase,
  getCombatMergeCostBase,
  getCombatReferenceRows,
  getCombatSkydustBase,
  getExpeditionDismantleBase,
  getExpeditionReferenceRows,
  getExpeditionStarIncrements,
} from "@/lib/reference-equipment-server";
import { LevelUpReference } from "@/components/level-up-reference";
import { TemplarsReferenceTable } from "@/components/templars-reference";
import { GemsReferenceTable } from "@/components/gems-reference";
import { ConsumablesReferenceTable } from "@/components/consumables-reference";
import { EventsReferenceTable } from "@/components/events-reference";
import {
  getGemParameters,
  getLevelUpParameters,
  getTemplarParameters,
} from "@/lib/admin-formulas-server";
import { getTemplarPresentation } from "@/lib/templars-presentation-server";
import { getConsumableCatalog } from "@/lib/consumables-server";
import { getEventsCatalog } from "@/lib/events-server";
import { languageAlternates } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: PageProps<"/referentiels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const reference = referenceCatalog.find((item) => item.slug === slug);
  if (!reference) return {};
  const [t, publicT] = await Promise.all([
    getTranslations("references"),
    getTranslations("Public"),
  ]);
  const name = t(`catalog.${reference.slug}`);
  return {
    title: name,
    description: publicT("descriptions.reference-detail", { name }),
    alternates: {
      languages: languageAlternates(`/referentiels/${slug}`),
    },
  };
}

export default async function ReferencePage({
  params,
}: PageProps<"/referentiels/[slug]">) {
  // Bloc 62/I review: forces per-request dynamic rendering — otherwise
  // Next has no dynamic API call to detect on this route (only a direct
  // Prisma read via getCalculatorAvailability) and statically caches the
  // first render per slug, so a later admin toggle never reaches this
  // page (same fix already applied to /referentiels/page.tsx, Bloc 60
  // review).
  await connection();
  const { slug } = await params;
  const reference = referenceCatalog.find((item) => item.slug === slug);
  if (!reference) notFound();
  const active = await getCalculatorAvailability();
  const t = await getTranslations("references");

  return (
    <main className="public-main">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="reference-page-title">{t(`catalog.${reference.slug}`)}</h1>
      {active[reference.calculatorSlug] ? (
        slug === "combat-equipment" ? (
          <CombatReferenceTable
            rows={await getCombatReferenceRows()}
            skydustBase={await getCombatSkydustBase()}
            gemSlotsBase={await getCombatGemSlotsBase()}
            mergeCostBase={await getCombatMergeCostBase()}
          />
        ) : slug === "level-up" ? (
          <LevelUpReference parameters={await getLevelUpParameters()} />
        ) : slug === "templars" ? (
          <TemplarsReferenceTable
            parameters={await getTemplarParameters()}
            presentation={await getTemplarPresentation()}
          />
        ) : slug === "gems" ? (
          <GemsReferenceTable parameters={await getGemParameters()} />
        ) : slug === "shop" ? (
          <ConsumablesReferenceTable catalog={await getConsumableCatalog()} />
        ) : slug === "events" ? (
          <EventsReferenceTable catalog={await getEventsCatalog()} />
        ) : (
          <ExpeditionReferenceTable
            rows={await getExpeditionReferenceRows()}
            increments={await getExpeditionStarIncrements()}
            dismantleBase={await getExpeditionDismantleBase()}
          />
        )
      ) : (
        <p className="empty-state">{t("single-unavailable")}</p>
      )}
    </main>
  );
}
