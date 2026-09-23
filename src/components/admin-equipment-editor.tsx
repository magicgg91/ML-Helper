"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import {
  countUnconfirmed,
  groupEquipmentSets,
} from "@/lib/admin-equipment-sets";
import {
  equipmentSkillLabels,
  equipmentSlotLayout,
  type EquipmentStarIncrements,
} from "@/lib/equipment";
import { equipmentRarityValues } from "@/lib/equipment-rarity";
import {
  expeditionStatKeys,
  mergeCostRarityKeys,
  type CombatReferenceRow,
  type ExpeditionReferenceRow,
  type ExpeditionStarIncrements,
} from "@/lib/reference-equipment";
import { launchLocales, type LaunchLocale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { CollapsibleGroup } from "./admin-collapsible-group";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { SearchInput } from "./admin-filters";
import { LangTabs } from "./admin-lang-tabs";
import { NumberField } from "./admin-number-field";
import { Pill } from "./admin-pill";
import type { EditorScreenProps } from "./admin-tool-editors";
import { useSaveStatus } from "./use-save-status";

/**
 * Bloc 119 §3 bis: the two equipment references — 180 Combat rows and 120
 * Expedition ones — read as the sets they actually are.
 *
 * Flat, every row repeated its set's name, family and rarity, so those three
 * were typed once per slot and could drift apart without anything noticing.
 * The grouping is computed at display (lib/admin-equipment-sets), the stored
 * model is untouched, and the set header edits the three shared fields for
 * every row of the set at once. A set whose rows disagree says so and goes
 * back to row-by-row editing rather than silently picking a winner.
 *
 * One save button, three writes — unchanged from Bloc 37/E, and deliberately
 * not merged into one: each of the three tables writes its own audit entry
 * today, and §4 requires the log to stay exactly as it is. The order is not
 * free either: Combat's main PUT reads the stored bases and stamps them into
 * every row, so the bases save first.
 */

type Variant = "combat" | "expedition";
type EquipmentRow = Record<string, string>;

const combatUnconfirmedFields = [
  "slot_name",
  ...[1, 2, 3, 4].flatMap((n) => [`skill_${n}`, `value_${n}_pct`]),
];
const expeditionUnconfirmedFields = [
  "type_stat_pct",
  "secondary_stat_name",
  "secondary_stat_pct",
];

/** How many sets are rendered before "Afficher plus de sets". */
const setsPerPage = 12;

const rarityKeys: Record<string, string> = {
  Commun: "common",
  Rare: "rare",
  Épique: "epic",
  Mythique: "mythic",
  Légendaire: "legendary",
};
const familyKeys: Record<string, string> = {
  Attaque: "attack",
  Défense: "defense",
  Or: "gold",
  "Troupes/Vitesse": "troops-speed",
  Équipement: "equipment",
  Consommables: "consumables",
  Troupes: "troops",
};
const slotKeys: Record<string, string> = {
  Amulette: "amulet",
  Casque: "helmet",
  Bracelet: "bracelet",
  Anneau: "ring",
  Ceinture: "belt",
  Gantelet: "gauntlet",
  Arme: "weapon",
  Bottes: "boots",
  Bouclier: "shield",
  Cape: "cloak",
  "Longue-vue": "spyglass",
  Sacoche: "pouch",
  Boussole: "compass",
  Torche: "torch",
  Pioche: "pickaxe",
};
const skillKeys: Record<string, string> = {
  Attaque: "striker",
  Bravoure: "brave",
  Charognard: "scavenger",
  Défense: "guardian",
  Intrépide: "fearless",
  Prospérité: "prosperous",
  Recruteur: "recruiter",
  Récupération: "cautious",
  Recycleur: "salvager",
  Vitesse: "rusher",
};
const statKeys: Record<string, string> = {
  Vitalité: "vitality",
  Perception: "perception",
  Récupération: "recovery",
  Vitesse: "speed",
  Esquive: "dodge",
  Chance: "luck",
};
/**
 * Expedition's star increments are keyed by four families and six stats at
 * once (expeditionStatKeys), so their labels come from two namespaces.
 */
const expeditionIncrementLabelKeys: Record<string, string> = {
  Or: "families.gold",
  Troupes: "families.troops",
  Équipement: "families.equipment",
  Consommables: "families.consumables",
  Vitalité: "stats.vitality",
  Perception: "stats.perception",
  Récupération: "stats.recovery",
  Vitesse: "stats.speed",
  Esquive: "stats.dodge",
  Chance: "stats.luck",
};
const weaponValues = [
  "Marteau",
  "Arc",
  "Lance",
  "Hache",
  "Sabre",
  "Épée",
  "Hallebarde",
];
const expeditionSlotValues = [
  "Cape",
  "Longue-vue",
  "Sacoche",
  "Boussole",
  "Torche",
  "Pioche",
];
const expeditionStatValues = [
  "Vitalité",
  "Perception",
  "Récupération",
  "Vitesse",
  "Esquive",
  "Chance",
];

type Option = { value: string; label: string };

function Select({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  unconfirmed = false,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  hideLabel?: boolean;
  /** An empty value is a gap in the data, and the field shows it as one. */
  unconfirmed?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1 text-xs font-medium text-admin-dim",
        hideLabel && "contents",
      )}
    >
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <select
        aria-label={hideLabel ? label : undefined}
        className={cn(
          "admin-control admin-focus h-9 rounded-admin-control border bg-admin-card px-2 text-sm text-admin-text",
          unconfirmed && value === ""
            ? "border-dashed border-admin-warn-ink/60"
            : "border-admin-card-border",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EquipmentReferenceEditor({
  variant,
  initialRows,
  secondaryInitial,
  incrementsInitial,
  backHref,
  backLabel,
  title,
  usedByTool,
}: EditorScreenProps & {
  variant: Variant;
  initialRows: CombatReferenceRow[] | ExpeditionReferenceRow[];
  secondaryInitial: {
    rows: { key: string; base: Record<string, number> }[];
    labels: Record<string, { fr?: string; en?: string } | undefined>;
  };
  incrementsInitial: EquipmentStarIncrements | ExpeditionStarIncrements;
  /** The tool this reference feeds — the cross-link chip of §3 bis. */
  usedByTool?: { label: string; href: string };
}) {
  const t = useTranslations("admin.references");
  const game = useTranslations("game");
  const common = useTranslations("common");
  const languageNames = useTranslations("admin.config.languages");
  const equipment = useTranslations(
    variant === "combat"
      ? "combat-equipment.columns"
      : "expedition-equipment.columns",
  );
  const status = useSaveStatus();
  const [labelLocale, setLabelLocale] = useState<LaunchLocale>("fr");

  const incrementKeys =
    variant === "combat"
      ? (equipmentSkillLabels as readonly string[])
      : (expeditionStatKeys as readonly string[]);

  const initialForm = useMemo(
    () => ({
      rows: (initialRows as EquipmentRow[]).map((row) => ({ ...row })),
      secondary: secondaryInitial.rows.map((row): EquipmentRow => ({
        metric_label_fr: secondaryInitial.labels[row.key]?.fr ?? "",
        metric_label_en: secondaryInitial.labels[row.key]?.en ?? "",
        ...Object.fromEntries(
          mergeCostRarityKeys.map((key) => [key, String(row.base[key])]),
        ),
      })),
      increments: Object.fromEntries(
        incrementKeys.map((key) => [
          key,
          String((incrementsInitial as Record<string, number>)[key]),
        ]),
      ) as EquipmentRow,
    }),
    [incrementKeys, incrementsInitial, initialRows, secondaryInitial],
  );

  const [form, setForm] = useState(initialForm);
  const [saved, setSaved] = useState(initialForm);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [family, setFamily] = useState("");
  const [slot, setSlot] = useState("");
  const [skill, setSkill] = useState("");
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingSet, setEditingSet] = useState<string>();
  const [shown, setShown] = useState(setsPerPage);

  const choose = (
    values: readonly string[],
    keys: Record<string, string>,
    ns: string,
  ) =>
    values.map((value) => ({
      value,
      label: value ? game(`${ns}.${keys[value]}`) : common("choose"),
    }));
  const rarityOptions = choose(
    ["", ...equipmentRarityValues],
    rarityKeys,
    "rarities",
  );
  const familyOptions = choose(
    [
      "",
      ...(variant === "combat"
        ? ["Attaque", "Défense", "Or", "Troupes/Vitesse"]
        : ["Or", "Équipement", "Consommables", "Troupes"]),
    ],
    familyKeys,
    "families",
  );
  const slotOptions = choose(
    [
      "",
      ...(variant === "combat" ? equipmentSlotLayout : expeditionSlotValues),
    ],
    slotKeys,
    "slots",
  );
  const skillOptions: Option[] = [
    { value: "", label: common("choose") },
    // Bloc 37/G: "none" is distinct from "" — an admin picks it to mark a
    // slot as never having a skill, so the public side shows "—" rather than
    // the "still needs data" placeholder.
    { value: "none", label: common("none") },
    ...equipmentSkillLabels.map((value) => ({
      value,
      label: game(`skills.${skillKeys[value]}`),
    })),
  ];
  const statOptions: Option[] = [
    { value: "", label: common("choose") },
    ...expeditionStatValues.map((value) => ({
      value,
      label: game(`stats.${statKeys[value]}`),
    })),
  ];
  const weaponOptions: Option[] = [
    { value: "", label: common("choose") },
    ...weaponValues.map((value) => ({ value, label: value })),
  ];

  const unconfirmedFields =
    variant === "combat"
      ? combatUnconfirmedFields
      : expeditionUnconfirmedFields;
  const slotField = variant === "combat" ? "slot_type" : "slot";

  const groups = useMemo(
    () =>
      groupEquipmentSets(
        form.rows as { set_name: string; family: string; rarity: string }[],
      ),
    [form.rows],
  );

  const filtering =
    query.trim() !== "" ||
    rarity !== "" ||
    family !== "" ||
    slot !== "" ||
    skill !== "" ||
    onlyUnconfirmed;

  const matching = useMemo(
    () =>
      groups.filter((group) => {
        if (
          query.trim() &&
          !group.name
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())
        )
          return false;
        if (rarity && !group.rarities.includes(rarity)) return false;
        if (family && !group.families.includes(family)) return false;
        return group.indexes.some((index) => {
          const row = form.rows[index];
          if (slot && row[slotField] !== slot) return false;
          if (
            skill &&
            (variant === "combat"
              ? ![1, 2, 3, 4].some((n) => row[`skill_${n}`] === skill)
              : row.secondary_stat_name !== skill)
          )
            return false;
          if (onlyUnconfirmed && countUnconfirmed(row, unconfirmedFields) === 0)
            return false;
          return true;
        });
      }),
    [
      family,
      form.rows,
      groups,
      onlyUnconfirmed,
      query,
      rarity,
      skill,
      slot,
      slotField,
      unconfirmedFields,
      variant,
    ],
  );

  const setRow = (index: number, patch: EquipmentRow) =>
    setForm((current) => ({
      ...current,
      rows: current.rows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));

  /** The ✎ button's edit: it reaches every row of the set at once. */
  const setWholeSet = (indexes: number[], patch: EquipmentRow) =>
    setForm((current) => ({
      ...current,
      rows: current.rows.map((row, i) =>
        indexes.includes(i) ? { ...row, ...patch } : row,
      ),
    }));

  async function save() {
    status.pending(t("saving"));
    const put = (endpoint: string, body: unknown) =>
      fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    try {
      // The bases go first: Combat's main PUT reads what is stored and
      // stamps it into every row (Bloc 37/E).
      const bases = await Promise.all([
        put(
          `/api/admin/guides/references/${variant}-equipment-secondary`,
          form.secondary,
        ),
        put(`/api/admin/guides/references/${variant}-equipment-increments`, [
          form.increments,
        ]),
      ]);
      if (bases.some((response) => !response.ok)) {
        status.error(t("save-all-error"));
        return;
      }
      const main = await put(
        `/api/admin/guides/references/${variant}-equipment`,
        form.rows,
      );
      if (!main.ok) {
        status.error(t("save-error", { status: main.status }));
        return;
      }
      setSaved(form);
      status.success(t("saved"));
    } catch {
      status.error(t("server-error"));
    }
  }

  const labelKey =
    `metric_label_${labelLocale === "fr" ? "fr" : "en"}` as const;

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        description={t(
          variant === "combat"
            ? "combat-description"
            : "expedition-description",
        )}
        pills={
          usedByTool && (
            <Pill tone="accent" href={usedByTool.href}>
              {t("used-by-tool", { tool: usedByTool.label })}
            </Pill>
          )
        }
        dirty={dirty}
        saving={status.isPending}
        onSave={save}
        onCancel={() => {
          setForm(saved);
          status.reset();
        }}
        message={status.message}
      />

      <EditorSection
        title={t("global-parameters")}
        actions={
          <LangTabs
            locale={labelLocale}
            onChange={setLabelLocale}
            label={t("labels-in")}
            filled={(code) =>
              form.secondary.some((row) =>
                (
                  row[`metric_label_${code === "fr" ? "fr" : "en"}`] ?? ""
                ).trim(),
              )
            }
            languageNames={Object.fromEntries(
              launchLocales.map((code) => [
                code,
                languageNames.has(code)
                  ? languageNames(code)
                  : code.toUpperCase(),
              ]),
            )}
          />
        }
      >
        <div className="overflow-x-auto rounded-admin-card border border-admin-card-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("global-parameters")}</caption>
            <thead className="bg-admin-head">
              <tr className="border-b border-admin-rule">
                <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                  {t("secondary-row")}
                </th>
                {mergeCostRarityKeys.map((key) => (
                  <th
                    key={key}
                    className="admin-column-head px-3 py-2 text-right text-admin-dim"
                  >
                    {game(`rarities.${rarityKeys[key] ?? key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.secondary.map((row, index) => (
                <tr
                  key={index}
                  className="h-[var(--admin-row-h-edit)] border-b border-admin-rule-soft last:border-0"
                >
                  <td className="px-3">
                    <input
                      aria-label={t("secondary-row-label", { row: index + 1 })}
                      className="admin-control admin-focus h-9 w-full min-w-[140px] rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                      type="text"
                      value={row[labelKey]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          secondary: current.secondary.map((item, i) =>
                            i === index
                              ? { ...item, [labelKey]: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </td>
                  {mergeCostRarityKeys.map((key) => (
                    <td key={key} className="px-3 text-right">
                      <NumberField
                        label={`${row[labelKey] || t("secondary-row-label", { row: index + 1 })} ${game(`rarities.${rarityKeys[key] ?? key}`)}`}
                        hideLabel
                        width="s"
                        value={row[key] === "" ? null : Number(row[key])}
                        onChange={(next) =>
                          setForm((current) => ({
                            ...current,
                            secondary: current.secondary.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    [key]: next === null ? "" : String(next),
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="admin-eyebrow mb-2 text-admin-dim">
            {t("star-increments")}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {incrementKeys.map((key) => (
              <NumberField
                key={key}
                label={
                  variant === "combat"
                    ? game(`skills.${skillKeys[key]}`)
                    : game(expeditionIncrementLabelKeys[key])
                }
                width="s"
                value={
                  form.increments[key] === ""
                    ? null
                    : Number(form.increments[key])
                }
                onChange={(next) =>
                  setForm((current) => ({
                    ...current,
                    increments: {
                      ...current.increments,
                      [key]: next === null ? "" : String(next),
                    },
                  }))
                }
              />
            ))}
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title={t("sets-section")}
        description={t("unknown-value-warning")}
      >
        <div className="flex flex-wrap items-end gap-3">
          <SearchInput
            label={t("search-set")}
            placeholder={t("search-set")}
            value={query}
            onChange={setQuery}
          />
          <Select
            label={equipment("rarity")}
            value={rarity}
            options={rarityOptions}
            onChange={setRarity}
          />
          <Select
            label={t("columns.family")}
            value={family}
            options={familyOptions}
            onChange={setFamily}
          />
          <Select
            label={
              variant === "combat" ? t("columns.slot-type") : equipment("slot")
            }
            value={slot}
            options={slotOptions}
            onChange={setSlot}
          />
          <Select
            label={
              variant === "combat"
                ? t("filters.skill")
                : equipment("secondary-stat")
            }
            value={skill}
            options={variant === "combat" ? skillOptions : statOptions}
            onChange={setSkill}
          />
          <button
            type="button"
            aria-pressed={onlyUnconfirmed}
            className={cn(
              "admin-focus h-9 rounded-admin-control border px-3 text-sm font-semibold",
              onlyUnconfirmed
                ? "border-admin-warn-ink bg-admin-warn text-admin-warn-ink"
                : "border-admin-card-border text-admin-dim",
            )}
            onClick={() => setOnlyUnconfirmed((current) => !current)}
          >
            {t("filter-unconfirmed")}
          </button>
        </div>

        <p className="text-sm text-admin-dim" role="status">
          {t("set-count", { count: matching.length })}
        </p>

        <div className="flex flex-col gap-2">
          {matching.slice(0, shown).map((group) => {
            const unconfirmed = group.indexes.reduce(
              (total, index) =>
                total + countUnconfirmed(form.rows[index], unconfirmedFields),
              0,
            );
            const first = form.rows[group.indexes[0]];
            return (
              <CollapsibleGroup
                key={group.name}
                title={group.name || t("set-unnamed")}
                // Folded by default; a filter opens what it matched, because
                // a search that shows nothing but headers is a search that
                // has to be clicked through twice.
                open={expanded.has(group.name) || filtering}
                onToggle={(next) =>
                  setExpanded((current) => {
                    const updated = new Set(current);
                    if (next) updated.add(group.name);
                    else updated.delete(group.name);
                    return updated;
                  })
                }
                count={t("slot-count", { count: group.indexes.length })}
                badges={
                  <>
                    {group.consistent ? (
                      <>
                        <Pill tone="neutral">
                          {game(`families.${familyKeys[first.family]}`)}
                        </Pill>
                        <Pill tone="accent">
                          {game(`rarities.${rarityKeys[first.rarity]}`)}
                        </Pill>
                      </>
                    ) : (
                      <Pill tone="warn">{t("set-inconsistent")}</Pill>
                    )}
                    {unconfirmed > 0 && (
                      <Pill tone="warn">
                        {t("unconfirmed-count", { count: unconfirmed })}
                      </Pill>
                    )}
                  </>
                }
                actions={
                  group.consistent && (
                    <AdminButton
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={t("edit-set", {
                        set: group.name || t("set-unnamed"),
                      })}
                      onClick={() =>
                        setEditingSet((current) =>
                          current === group.name ? undefined : group.name,
                        )
                      }
                    >
                      <PencilIcon aria-hidden="true" />
                    </AdminButton>
                  )
                }
              >
                <div className="flex flex-col gap-3 p-3">
                  {!group.consistent && (
                    <p className="text-sm text-admin-danger-ink">
                      {t("set-inconsistent-help")}
                    </p>
                  )}
                  {editingSet === group.name && group.consistent && (
                    <div className="flex flex-wrap gap-3 rounded-admin-control border border-admin-accent bg-admin-accent-soft p-3">
                      <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
                        {t("columns.set-name")}
                        <input
                          className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                          type="text"
                          value={first.set_name}
                          onChange={(event) =>
                            setWholeSet(group.indexes, {
                              set_name: event.target.value,
                            })
                          }
                        />
                      </label>
                      <Select
                        label={t("columns.family")}
                        value={first.family}
                        options={familyOptions.filter((o) => o.value !== "")}
                        onChange={(value) =>
                          setWholeSet(group.indexes, { family: value })
                        }
                      />
                      <Select
                        label={equipment("rarity")}
                        value={first.rarity}
                        options={rarityOptions.filter((o) => o.value !== "")}
                        onChange={(value) =>
                          setWholeSet(group.indexes, { rarity: value })
                        }
                      />
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <caption className="sr-only">
                        {group.name || t("set-unnamed")}
                      </caption>
                      <thead>
                        <tr className="border-b border-admin-rule">
                          {(variant === "combat"
                            ? [
                                t("columns.slot-type"),
                                t("columns.slot-name"),
                                ...[1, 2, 3, 4].flatMap((n) => [
                                  equipment("skill", { number: n }),
                                  t("columns.value", { number: n }),
                                ]),
                              ]
                            : [
                                equipment("slot"),
                                t("columns.type-value"),
                                equipment("secondary-stat"),
                                t("columns.secondary-value"),
                              ]
                          ).map((label, index) => (
                            <th
                              key={index}
                              className="admin-column-head px-2 py-1 text-left text-admin-dim"
                            >
                              {label}
                            </th>
                          ))}
                          {!group.consistent && (
                            <>
                              <th className="admin-column-head px-2 py-1 text-left text-admin-dim">
                                {t("columns.family")}
                              </th>
                              <th className="admin-column-head px-2 py-1 text-left text-admin-dim">
                                {equipment("rarity")}
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.indexes.map((index) => {
                          const row = form.rows[index];
                          const name = (field: string) =>
                            t(
                              variant === "combat"
                                ? "row-label"
                                : "expedition-row-label",
                              { row: index + 1, field },
                            );
                          return (
                            <EquipmentRowCells
                              key={index}
                              variant={variant}
                              row={row}
                              name={name}
                              inconsistent={!group.consistent}
                              equipmentLabel={equipment}
                              columnLabel={t}
                              slotOptions={slotOptions.filter(
                                (o) => o.value !== "",
                              )}
                              weaponOptions={weaponOptions}
                              skillOptions={skillOptions}
                              statOptions={statOptions}
                              familyOptions={familyOptions.filter(
                                (o) => o.value !== "",
                              )}
                              rarityOptions={rarityOptions.filter(
                                (o) => o.value !== "",
                              )}
                              onChange={(patch) => setRow(index, patch)}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CollapsibleGroup>
            );
          })}
        </div>

        {matching.length > shown && (
          <AdminButton
            type="button"
            className="self-start"
            onClick={() => setShown((current) => current + setsPerPage)}
          >
            {t("show-more-sets")}
          </AdminButton>
        )}
      </EditorSection>
    </div>
  );
}

function EquipmentRowCells({
  variant,
  row,
  name,
  inconsistent,
  equipmentLabel,
  columnLabel,
  slotOptions,
  weaponOptions,
  skillOptions,
  statOptions,
  familyOptions,
  rarityOptions,
  onChange,
}: {
  variant: Variant;
  row: EquipmentRow;
  name: (field: string) => string;
  /** A set whose rows disagree edits family and rarity row by row. */
  inconsistent: boolean;
  equipmentLabel: (key: string, values?: Record<string, number>) => string;
  columnLabel: (key: string, values?: Record<string, number>) => string;
  slotOptions: Option[];
  weaponOptions: Option[];
  skillOptions: Option[];
  statOptions: Option[];
  familyOptions: Option[];
  rarityOptions: Option[];
  onChange: (patch: EquipmentRow) => void;
}) {
  const cell = (children: ReactNode, key: string) => (
    <td key={key} className="px-2 py-1">
      {children}
    </td>
  );
  return (
    <tr className="border-b border-admin-rule-soft last:border-0">
      {variant === "combat" ? (
        <>
          {cell(
            <Select
              label={name(columnLabel("columns.slot-type"))}
              hideLabel
              value={row.slot_type}
              options={slotOptions}
              onChange={(value) => onChange({ slot_type: value })}
            />,
            "slot_type",
          )}
          {cell(
            <Select
              label={name(columnLabel("columns.slot-name"))}
              hideLabel
              unconfirmed
              value={row.slot_name}
              options={weaponOptions}
              onChange={(value) => onChange({ slot_name: value })}
            />,
            "slot_name",
          )}
          {[1, 2, 3, 4].flatMap((n) => [
            cell(
              <Select
                label={name(equipmentLabel("skill", { number: n }))}
                hideLabel
                unconfirmed
                value={row[`skill_${n}`]}
                options={skillOptions}
                onChange={(value) => onChange({ [`skill_${n}`]: value })}
              />,
              `skill_${n}`,
            ),
            cell(
              <NumberField
                label={name(columnLabel("columns.value", { number: n }))}
                hideLabel
                width="s"
                unit="%"
                value={
                  row[`value_${n}_pct`] === ""
                    ? null
                    : Number(row[`value_${n}_pct`])
                }
                onChange={(next) =>
                  onChange({
                    [`value_${n}_pct`]: next === null ? "" : String(next),
                  })
                }
              />,
              `value_${n}`,
            ),
          ])}
        </>
      ) : (
        <>
          {cell(
            <Select
              label={name(equipmentLabel("slot"))}
              hideLabel
              value={row.slot}
              options={slotOptions}
              onChange={(value) => onChange({ slot: value })}
            />,
            "slot",
          )}
          {cell(
            <NumberField
              label={name(columnLabel("columns.type-value"))}
              hideLabel
              width="s"
              unit="%"
              value={
                row.type_stat_pct === "" ? null : Number(row.type_stat_pct)
              }
              onChange={(next) =>
                onChange({ type_stat_pct: next === null ? "" : String(next) })
              }
            />,
            "type_stat_pct",
          )}
          {cell(
            <Select
              label={name(equipmentLabel("secondary-stat"))}
              hideLabel
              unconfirmed
              value={row.secondary_stat_name}
              options={statOptions}
              onChange={(value) => onChange({ secondary_stat_name: value })}
            />,
            "secondary_stat_name",
          )}
          {cell(
            <NumberField
              label={name(columnLabel("columns.secondary-value"))}
              hideLabel
              width="s"
              unit="%"
              value={
                row.secondary_stat_pct === ""
                  ? null
                  : Number(row.secondary_stat_pct)
              }
              onChange={(next) =>
                onChange({
                  secondary_stat_pct: next === null ? "" : String(next),
                })
              }
            />,
            "secondary_stat_pct",
          )}
        </>
      )}
      {inconsistent && (
        <>
          {cell(
            <Select
              label={name(columnLabel("columns.family"))}
              hideLabel
              value={row.family}
              options={familyOptions}
              onChange={(value) => onChange({ family: value })}
            />,
            "family",
          )}
          {cell(
            <Select
              label={name(equipmentLabel("rarity"))}
              hideLabel
              value={row.rarity}
              options={rarityOptions}
              onChange={(value) => onChange({ rarity: value })}
            />,
            "rarity",
          )}
        </>
      )}
    </tr>
  );
}
