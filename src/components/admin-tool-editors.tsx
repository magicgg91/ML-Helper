"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { cityLeagues, type CityParameters } from "@/lib/city-parameters";
import type { XpTier } from "@/lib/combat-calculators";
import type { GemParameters } from "@/lib/gem-parameters";
import {
  leagues as allLeagues,
  skillKeys,
  type League,
} from "@/lib/player-settings";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { FormulaBox } from "./admin-formula-box";
import { NumberField } from "./admin-number-field";
import { Pill } from "./admin-pill";
import { PreviewBar } from "./admin-preview-bar";
import { useEditorForm } from "./use-editor-form";

/**
 * Bloc 119 §3 bis: the tool editors that are nothing but named numbers —
 * Paramètres Villes partagés, Gemmes, Taux de gain d'XP, Troupes en attaque
 * démo.
 *
 * They kept their endpoints, their payloads and their validation: this is a
 * change of screen, not of data. What is new is what the screen can now say —
 * the formula the numbers feed, whether anything is unsaved, and what an
 * emptied field means. That last one is the reason these four moved together:
 * they all used `<input type="number">`, where a French comma arrived as the
 * empty string and `Number("")` stored 0.
 */

/**
 * What every edit screen needs from the page that routes to it: where the
 * trail goes back to, and the screen's name. The name stays in `admin.tools`
 * where the list already reads it, so a tool is called the same thing in the
 * table and on its own screen.
 */
export type EditorScreenProps = {
  backHref: string;
  backLabel: string;
  title: string;
};

/** The column header of a numeric column, right-aligned like its figures. */
function NumberHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="admin-column-head px-3 py-2 text-right text-admin-dim">
      {children}
    </th>
  );
}

function EditTable({
  caption,
  head,
  children,
}: {
  caption: string;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-admin-card border border-admin-card-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-admin-head">
          <tr className="border-b border-admin-rule">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EditRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="h-[var(--admin-row-h-edit)] border-b border-admin-rule-soft last:border-0">
      {children}
    </tr>
  );
}

/* ------------------------------------------------------------------ Villes */

export function CityParametersEditor({
  initial,
  backHref,
  backLabel,
  title,
  sharedTools,
}: EditorScreenProps & {
  initial: CityParameters;
  /** The tools whose "Modifier" opens this very screen (admin-tool-sources). */
  /**
   * `slug` porte la clé React, pas `href` : les trois outils Villes
   * partagent cet éditeur et pointent donc tous vers la même page
   * (/admin/tools). Keyer sur la href donnait trois clés identiques, ce que
   * React signale et qui l'autorise à en omettre ou en dupliquer.
   */
  sharedTools: { slug: string; label: string; href: string }[];
}) {
  const t = useTranslations("admin.city-parameters");
  const leagues = useTranslations("game.leagues");
  const form = useEditorForm({
    initial,
    endpoint: "/api/admin/tools/city-parameters",
  });
  const value = form.value;

  const setFormula = (
    key: "vp" | "walls" | "cost",
    field: "base" | "ratio",
    next: number | null,
  ) =>
    form.setValue((current) => ({
      ...current,
      [key]: { ...current[key], [field]: next as number },
    }));

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        description={t("subtitle")}
        pills={
          <>
            <Pill tone="neutral">
              {t("used-by", { count: sharedTools.length })}
            </Pill>
            {sharedTools.map((tool) => (
              <Pill key={tool.slug} tone="accent" href={tool.href}>
                {tool.label}
              </Pill>
            ))}
          </>
        }
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />
      <EditorSection
        title={t("progression")}
        description={t("progression-help")}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(["vp", "walls", "cost"] as const).map((key) => (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-admin-card border border-admin-card-border bg-admin-head p-4"
            >
              <h3 className="admin-section-title text-admin-text">
                {t(`${key}.title`)}
              </h3>
              <div className="flex flex-wrap gap-3">
                <NumberField
                  label={t(`${key}.base`)}
                  value={value[key].base}
                  width="m"
                  onChange={(next) => setFormula(key, "base", next)}
                />
                <NumberField
                  label={t(`${key}.ratio`)}
                  value={value[key].ratio}
                  width="m"
                  onChange={(next) => setFormula(key, "ratio", next)}
                />
              </div>
            </div>
          ))}
        </div>
      </EditorSection>
      <EditorSection title={t("multipliers")}>
        <EditTable
          caption={t("multipliers")}
          head={
            <>
              <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                {t("league")}
              </th>
              <NumberHead>{t("army")}</NumberHead>
              <NumberHead>{t("gold")}</NumberHead>
            </>
          }
        >
          {cityLeagues.map((league) => (
            <EditRow key={league}>
              <td className="px-3 font-semibold text-admin-text">
                {leagues(league)}
              </td>
              {(["army", "gold"] as const).map((field) => (
                <td key={field} className="px-3 text-right">
                  <NumberField
                    label={`${leagues(league)} ${t(field)}`}
                    hideLabel
                    width="s"
                    value={value.multipliers[league][field]}
                    onChange={(next) =>
                      form.setValue((current) => ({
                        ...current,
                        multipliers: {
                          ...current.multipliers,
                          [league]: {
                            ...current.multipliers[league],
                            [field]: next as number,
                          },
                        },
                      }))
                    }
                  />
                </td>
              ))}
            </EditRow>
          ))}
        </EditTable>
      </EditorSection>
    </div>
  );
}

/* ------------------------------------------------------------------ Gemmes */

/**
 * Bloc 125 §4: one column template for both sections of the screen, so a
 * price lands exactly under the league it belongs to.
 *
 * The two used to be independent tables — a wide one of skills × leagues, and
 * under it a second, vertical one listing the six leagues again, one per row.
 * Reading "how much does a Gold gem cost" meant finding Gold in a column
 * above and then Gold in a row below. One grid, shared, answers it by
 * position.
 */
const gemGrid = "grid-cols-[180px_repeat(6,minmax(0,1fr))]";

export function GemParametersEditor({
  initial,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & { initial: GemParameters }) {
  const t = useTranslations("admin.gems");
  const game = useTranslations("game");
  const form = useEditorForm({
    initial,
    endpoint: "/api/admin/tools/gems",
  });
  const value = form.value;

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        description={t("subtitle")}
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />
      <FormulaBox>{t("formula")}</FormulaBox>
      <EditorSection title={t("value")}>
        {/* Not a <table>: every field here carries its own accessible name
            ("Attaque en Or"), so the grid adds alignment without taking any
            of the meaning away — and it is the same grid the prices use. */}
        <div className="overflow-x-auto">
          <div className="min-w-[46rem]">
            <div
              className={cn(
                "grid items-center gap-x-3 border-b border-admin-rule pb-2",
                gemGrid,
              )}
            >
              <span className="admin-column-head px-3 text-admin-dim">
                {t("skill")}
              </span>
              {allLeagues.map((league) => (
                <span
                  key={league}
                  className="admin-column-head px-3 text-right text-admin-dim"
                >
                  {game(`leagues.${league}`)}
                </span>
              ))}
            </div>
            {skillKeys.map((skill) => (
              <div
                key={skill}
                className={cn(
                  "grid items-center gap-x-3 border-b border-admin-rule-soft py-1 last:border-0",
                  gemGrid,
                )}
              >
                <span className="px-3 text-sm font-semibold text-admin-text">
                  {game(`skills.${skill}`)}
                </span>
                {allLeagues.map((league) => (
                  <span key={league} className="flex justify-end px-3">
                    <NumberField
                      label={t("value-field", {
                        skill: game(`skills.${skill}`),
                        league: game(`leagues.${league}`),
                      })}
                      hideLabel
                      width="s"
                      value={value.skillLeagueValue[skill][league]}
                      onChange={(next) =>
                        form.setValue((current) => ({
                          ...current,
                          skillLeagueValue: {
                            ...current.skillLeagueValue,
                            [skill]: {
                              ...current.skillLeagueValue[skill],
                              [league]: next as number,
                            },
                          },
                        }))
                      }
                    />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </EditorSection>
      <EditorSection title={t("price")} description={t("price-help")}>
        <div className="overflow-x-auto">
          <div className="min-w-[46rem]">
            <div className={cn("grid items-center gap-x-3", gemGrid)}>
              {/* The unit is said once, in the row's name, instead of being
                  repeated in all six cells. */}
              <span className="px-3 text-sm font-semibold text-admin-text">
                {t("price-row")}
              </span>
              {/* Bloc 126/B: six fields, Bronze included. It used to print a
                  dash there, because the game sells no Bronze gems — true
                  today, and a reason to leave the field empty rather than to
                  withhold it. The day the studio opens a Bronze shop, the
                  price is typed in here; nothing has to be built first. */}
              {allLeagues.map((league) => (
                <span key={league} className="flex justify-end px-3">
                  <NumberField
                    label={t("price-field", {
                      league: game(`leagues.${league}`),
                    })}
                    hideLabel
                    width="s"
                    value={value.gemPrice[league]}
                    onChange={(next) =>
                      form.setValue((current) => ({
                        ...current,
                        gemPrice: { ...current.gemPrice, [league]: next },
                      }))
                    }
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

/* --------------------------------------------------------- Taux de gain XP */

export function XpGainRateEditor({
  initial,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & { initial: XpTier[] }) {
  const t = useTranslations("admin.xp-gain-rate");
  const form = useEditorForm({
    initial,
    endpoint: "/api/admin/tools/xp-gain-rate",
    body: (tiers) => ({ tiers }),
  });
  const tiers = form.value;

  // A tier's upper bound is the next tier's lower bound: one field moves both
  // sides, so the five tiers can never gain a gap or an overlap.
  const setBoundary = (index: number, next: number | null) =>
    form.setValue((current) =>
      current.map((tier, i) =>
        i === index
          ? { ...tier, high: next }
          : i === index + 1
            ? { ...tier, low: (next ?? 0) as number }
            : tier,
      ),
    );
  const setRate = (index: number, next: number | null) =>
    form.setValue((current) =>
      current.map((tier, i) =>
        i === index ? { ...tier, rate: next as number } : tier,
      ),
    );

  // A warning, not a refusal: the thresholds are game data, and the brief
  // asks for a non-blocking notice (§3 bis).
  const bounds = tiers
    .map((tier) => tier.high)
    .filter((high): high is number => high !== null);
  const increasing = bounds.every(
    (high, index) => index === 0 || high > bounds[index - 1],
  );

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        description={t("subtitle")}
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />
      <FormulaBox>{t("formula")}</FormulaBox>
      {!increasing && (
        <p
          className="rounded-admin-card border border-admin-card-border bg-admin-warn px-4 py-3 text-sm text-admin-warn-ink"
          role="status"
        >
          {t("not-increasing")}
        </p>
      )}
      <EditorSection title={t("tiers")}>
        <EditTable
          caption={t("tiers")}
          head={
            <>
              <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                {t("tier")}
              </th>
              <NumberHead>{t("from")}</NumberHead>
              <NumberHead>{t("up-to")}</NumberHead>
              <NumberHead>{t("rate")}</NumberHead>
              <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                {t("preview")}
              </th>
            </>
          }
        >
          {tiers.map((tier, index) => (
            <EditRow key={index}>
              <td className="px-3 font-semibold text-admin-text">
                {index + 1}
              </td>
              {/* Read-only: it is the previous tier's upper bound, and 0 for
                  the first — two fields for one number is how they drift. */}
              <td className="px-3 text-right tabular-nums text-admin-dim">
                {tier.low}
              </td>
              <td className="px-3 text-right">
                {tier.high === null ? (
                  <span aria-label={t("no-upper-bound")}>∞</span>
                ) : (
                  <NumberField
                    label={t("upper-bound-field", { tier: index + 1 })}
                    hideLabel
                    width="s"
                    unit="%"
                    value={tier.high}
                    onChange={(next) => setBoundary(index, next)}
                  />
                )}
              </td>
              <td className="px-3 text-right">
                <NumberField
                  label={t("rate-field", { tier: index + 1 })}
                  hideLabel
                  width="s"
                  unit="%"
                  value={tier.rate}
                  onChange={(next) => setRate(index, next)}
                />
              </td>
              <td className="w-[30%] px-3">
                <PreviewBar
                  value={tier.rate}
                  max={Math.max(100, ...tiers.map((item) => item.rate))}
                />
              </td>
            </EditRow>
          ))}
        </EditTable>
      </EditorSection>
    </div>
  );
}

/* --------------------------------------------- Troupes en attaque démo */

export function DemoAttackTroopsEditor({
  initial,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & { initial: Record<League, number> }) {
  const t = useTranslations("admin.demo-attack-troops");
  const gameLeagues = useTranslations("game.leagues");
  const form = useEditorForm({
    initial,
    endpoint: "/api/admin/tools/demo-attack-troops",
    body: (percentages) => ({ percentages }),
  });
  const value = form.value;

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        description={t("subtitle")}
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />
      <FormulaBox>{t("formula")}</FormulaBox>
      <EditorSection title={t("per-league")}>
        <EditTable
          caption={t("per-league")}
          head={
            <>
              <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                {t("league")}
              </th>
              <NumberHead>{t("percentage")}</NumberHead>
              <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                {t("preview")}
              </th>
            </>
          }
        >
          {allLeagues.map((league) => (
            <EditRow key={league}>
              <td className="px-3 font-semibold text-admin-text">
                {gameLeagues(league)}
              </td>
              <td className="px-3 text-right">
                <NumberField
                  label={`${gameLeagues(league)} ${t("percentage")}`}
                  hideLabel
                  width="s"
                  unit="%"
                  value={value[league]}
                  onChange={(next) =>
                    form.setValue((current) => ({
                      ...current,
                      [league]: next as number,
                    }))
                  }
                />
              </td>
              <td className="w-[40%] px-3">
                <PreviewBar value={value[league]} max={100} />
              </td>
            </EditRow>
          ))}
        </EditTable>
      </EditorSection>
    </div>
  );
}
