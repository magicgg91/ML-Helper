import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CombatReferenceTable,
  ExpeditionReferenceTable,
} from "@/components/reference-tables";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { referenceCatalog } from "@/lib/reference-catalog";
import {
  getCombatReferenceRows,
  getCombatSecondaryBase,
  getExpeditionReferenceRows,
  getExpeditionSecondaryBase,
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
import { pageMetadata } from "@/lib/page-metadata";
import { Breadcrumb } from "@/components/breadcrumb";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/referentiels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const reference = referenceCatalog.find((item) => item.slug === slug);
  if (!reference) return {};
  const [t, locale, active] = await Promise.all([
    getTranslations("references"),
    getLocale(),
    getCalculatorAvailability(),
  ]);
  // Bloc 91/E2: each reference now has its own description
  // (references.descriptions.<slug>) instead of the single templated
  // "{name} reference…" phrase that made all 7 indistinguishable; Bloc 91/E3
  // adds the OG/Twitter card.
  const meta = pageMetadata({
    locale,
    path: `/referentiels/${slug}`,
    title: t(`catalog.${reference.slug}`),
    description: t(`descriptions.${reference.slug}`),
  });
  // Bloc 91/F2: an inactive reference (e.g. Events, off by default) still
  // renders a 200 "unavailable" page, and it's already kept out of the sitemap
  // and site search — but a guessed or externally-linked URL would otherwise be
  // indexable. Mark it noindex until an admin activates it.
  return active[reference.calculatorSlug]
    ? meta
    : { ...meta, robots: { index: false } };
}

export default async function ReferencePage({
  params,
}: PageProps<"/[locale]/referentiels/[slug]">) {
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
  const [active, t, nav, locale] = await Promise.all([
    getCalculatorAvailability(),
    getTranslations("references"),
    getTranslations("Navigation"),
    getLocale(),
  ]);
  const name = t(`catalog.${reference.slug}`);

  return (
    <main className="public-main">
      {/* Bloc 91/M7: breadcrumb Accueil › Référentiels › <name>. */}
      <Breadcrumb
        locale={locale}
        label={nav("breadcrumb")}
        items={[
          { path: "/", label: nav("home") },
          { path: "/referentiels", label: nav("referentiels") },
          { path: `/referentiels/${slug}`, label: name },
        ]}
      />
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="reference-page-title">{name}</h1>
      {active[reference.calculatorSlug] ? (
        slug === "combat-equipment" ? (
          <CombatReferenceTable
            rows={await getCombatReferenceRows()}
            secondaryBase={await getCombatSecondaryBase()}
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
            secondaryBase={await getExpeditionSecondaryBase()}
          />
        )
      ) : (
        <p className="empty-state">{t("single-unavailable")}</p>
      )}
    </main>
  );
}
