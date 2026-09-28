"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatGameNumber } from "@/lib/format";
import {
  hasLevelUpTroopsFormula,
  levelUpTroopsAt,
  parseLevelUpParameters,
  type LevelUpParameters,
} from "@/lib/level-up";
import { leagues as allLeagues, type League } from "@/lib/player-settings";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { FormulaBox } from "./admin-formula-box";
import { NumberField } from "./admin-number-field";
import { Pill, type PillTone } from "./admin-pill";
import type { EditorScreenProps } from "./admin-tool-editors";
import { useEditorForm } from "./use-editor-form";

/**
 * Bloc 119 §3 bis: the Progression reference — the XP curve and one troop
 * formula per league.
 *
 * Two columns are new, and they exist because of what Bloc 107/A found:
 * Bronze's ratio 1.245 and Silver's 1.243 agree to within 0.3% up to level 10
 * and are 10% apart by level 60. A ratio typed one league off is therefore
 * invisible exactly where an admin would check it. The screen now computes
 * level 60 and the gap against Bronze — with `levelUpTroopsAt`, the public
 * table's own function — so the mistake is on screen before the save.
 */

/** Where a league's level-60 figure stops being a rounding difference. */
const gapNoticeable = 0.5;
const gapAlarming = 10;

export function ProgressionEditor({
  initial,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & { initial: LevelUpParameters }) {
  const t = useTranslations("admin.parameters");
  const leagues = useTranslations("game.leagues");
  const locale = useLocale();
  // Written in the admin's own language, sign always shown: "+10,5" reads as
  // a gap, "10,5" reads as a value.
  const gapFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  });
  const form = useEditorForm<LevelUpParameters>({
    initial,
    endpoint: "/api/admin/guides/references/level-up",
    // Bloc 107/A: this form used to show what was TYPED and never what was
    // stored, so a save the route rejected (or normalised) looked exactly
    // like one it accepted — and the public table, which computes from the
    // stored row, could disagree with this screen indefinitely. The route
    // echoes the parsed parameters, so adopt them.
    adopt: (stored) => parseLevelUpParameters(stored),
  });
  const value = form.value;

  const setTroops = (
    league: League,
    field: "coefficient" | "ratio",
    next: number | null,
  ) =>
    form.setValue((current) => ({
      ...current,
      troops: {
        ...current.troops,
        [league]: { ...current.troops[league], [field]: next ?? 0 },
      },
    }));

  const atSixty = (league: League) => levelUpTroopsAt(60, league, value);
  const bronzeAtSixty = atSixty("bronze");

  const gapOf = (league: League) => {
    const troops = atSixty(league);
    if (troops === null || bronzeAtSixty === null || bronzeAtSixty === 0)
      return null;
    return ((troops - bronzeAtSixty) / bronzeAtSixty) * 100;
  };
  const gapTone = (gap: number): PillTone => {
    const size = Math.abs(gap);
    if (size >= gapAlarming) return "warn";
    if (size >= gapNoticeable) return "accent";
    return "neutral";
  };

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        dirty={form.dirty}
        saving={form.saving}
        onSave={form.save}
        onCancel={form.cancel}
        message={form.message}
      />

      <EditorSection title={t("xp-section")}>
        <div className="flex flex-wrap gap-3">
          <NumberField
            label={t("xp-base")}
            value={value.xp.base}
            width="m"
            onChange={(base) =>
              form.setValue((current) => ({
                ...current,
                xp: { ...current.xp, base: base ?? 0 },
              }))
            }
          />
          <NumberField
            label={t("xp-ratio")}
            value={value.xp.ratio}
            width="m"
            onChange={(ratio) =>
              form.setValue((current) => ({
                ...current,
                xp: { ...current.xp, ratio: ratio ?? 0 },
              }))
            }
          />
        </div>
      </EditorSection>

      <EditorSection title={t("troops-section")} description={t("troops-hint")}>
        <FormulaBox note={t("troops-from-level-2")}>
          {t("troops-formula")}
        </FormulaBox>
        <div className="overflow-x-auto rounded-admin-card border border-admin-card-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("troops-section")}</caption>
            <thead className="bg-admin-head">
              <tr className="border-b border-admin-rule">
                <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                  {t("league")}
                </th>
                {["coefficient", "ratio", "at-level-60", "gap-vs-bronze"].map(
                  (key) => (
                    <th
                      key={key}
                      className="admin-column-head px-3 py-2 text-right text-admin-dim"
                    >
                      {t(key)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {/* Bloc 42/B: every league gets a real coefficient/ratio field —
                  AGENTS.md requires unconfirmed data to stay admin-editable
                  with a default value. Bloc 98/A+C: one row per league, in
                  game progression order, and the "not confirmed" note is
                  driven by what is stored, so it disappears as soon as a
                  league's two values are filled in. */}
              {allLeagues.map((league) => {
                const confirmed = hasLevelUpTroopsFormula(league, value);
                const troops = atSixty(league);
                const gap = league === "bronze" ? null : gapOf(league);
                return (
                  <tr
                    key={league}
                    className="h-[var(--admin-row-h-edit)] border-b border-admin-rule-soft last:border-0"
                  >
                    <td className="px-3">
                      <span className="font-semibold text-admin-text">
                        {leagues(league)}
                      </span>
                      {!confirmed && (
                        <Pill className="ml-2" tone="warn">
                          {t("unconfirmed")}
                        </Pill>
                      )}
                    </td>
                    <td className="px-3 text-right">
                      <NumberField
                        label={`${leagues(league)} ${t("coefficient")}`}
                        hideLabel
                        width="m"
                        value={value.troops[league].coefficient}
                        onChange={(next) =>
                          setTroops(league, "coefficient", next)
                        }
                      />
                    </td>
                    <td className="px-3 text-right">
                      <NumberField
                        label={`${leagues(league)} ${t("ratio")}`}
                        hideLabel
                        width="m"
                        value={value.troops[league].ratio}
                        onChange={(next) => setTroops(league, "ratio", next)}
                      />
                    </td>
                    <td
                      className="px-3 text-right tabular-nums text-admin-text"
                      data-testid={`level-60-${league}`}
                    >
                      {troops === null ? (
                        <span className="text-admin-dim">—</span>
                      ) : (
                        formatGameNumber(troops)
                      )}
                    </td>
                    <td className="px-3 text-right">
                      {gap === null ? (
                        <span className="text-admin-dim">—</span>
                      ) : (
                        <Pill tone={gapTone(gap)}>
                          {t("gap-value", { gap: gapFormat.format(gap) })}
                        </Pill>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </EditorSection>
    </div>
  );
}
