import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  CombatReferenceTable,
  ExpeditionReferenceTable,
} from "@/components/reference-tables";
import { getCalculatorAvailability } from "@/lib/calculators-server";
import { referenceCatalog, referenceHref } from "@/lib/reference-catalog";
import {
  getCombatGemSlotsBase,
  getCombatReferenceRows,
  getCombatSkydustBase,
  getExpeditionDismantleBase,
  getExpeditionReferenceRows,
  getExpeditionStarIncrements,
} from "@/lib/reference-equipment-server";
import { LevelUpReference } from "@/components/level-up-reference";
import { TemplarsReferenceTable } from "@/components/templars-reference";
import { GemsReferenceTable } from "@/components/gems-reference";
import {
  getGemParameters,
  getLevelUpParameters,
  getTemplarParameters,
} from "@/lib/admin-formulas-server";

export async function generateMetadata({
  params,
}: PageProps<"/guides/referentiels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const reference = referenceCatalog.find((item) => item.slug === slug);
  if (!reference) return {};
  const t = await getTranslations("references");
  return { title: t(`catalog.${reference.slug}`) };
}

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
      <h1 className="reference-page-title">{t(`catalog.${reference.slug}`)}</h1>
      {/* Bloc 35/1.2: switch directly between references without a detour
          through /guides. Bloc 40/A: reuses the exact same container/button
          classes as the /tools category banner (category-nav/category-btn)
          instead of just visually similar family-buttons pills — the pill
          row never grows past its content width, so it fell short of the
          tools banner's full-width layout. */}
      <nav
        className="reference-switcher category-nav"
        aria-label={t("tabs-label")}
      >
        {referenceCatalog
          .filter((item) => active[item.calculatorSlug])
          .map((item) => (
            <Link
              className="category-btn"
              key={item.slug}
              href={referenceHref(item.slug)}
              aria-current={item.slug === reference.slug ? "page" : undefined}
            >
              {t(`catalog.${item.slug}`)}
            </Link>
          ))}
      </nav>
      {active[reference.calculatorSlug] ? (
        slug === "combat-equipment" ? (
          <CombatReferenceTable
            rows={await getCombatReferenceRows()}
            skydustBase={await getCombatSkydustBase()}
            gemSlotsBase={await getCombatGemSlotsBase()}
          />
        ) : slug === "level-up" ? (
          <LevelUpReference parameters={await getLevelUpParameters()} />
        ) : slug === "templiers" ? (
          <TemplarsReferenceTable parameters={await getTemplarParameters()} />
        ) : slug === "gemmes" ? (
          <GemsReferenceTable parameters={await getGemParameters()} />
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
