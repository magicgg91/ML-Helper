"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  isSavableRankingLadder,
  rankingEntryId,
  rankMovements,
  rankRewardTypes,
  type RankingEntry,
  type RankingLadder,
  type RankMovement,
  type RankRewardType,
} from "@/lib/ranking";
import { leagues, type League } from "@/lib/player-settings";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { ConfirmDialog } from "./admin-confirm-dialog";
import { EditorHeader } from "./admin-editor-header";
import { EditorSection } from "./admin-editor-section";
import { NumberField } from "./admin-number-field";
import { OverflowMenu } from "./admin-overflow-menu";
import { RowActions } from "./admin-row-actions";
import type { EditorScreenProps } from "./admin-tool-editors";
import { VisibilitySwitch } from "./admin-visibility-switch";
import { rankingEntryLabel } from "./ranking-calculator";
import { useEditorForm } from "./use-editor-form";

/**
 * Bloc 119 §3 bis: the Classement editor, as master and detail.
 *
 * It used to stack every entry's full form down one page — a dozen identical
 * blocks, each with its own table, and nothing to say which one you were in.
 * The list on the left now holds the whole ladder at a glance (visible or
 * not, how many bands), and the right side holds exactly one entry.
 *
 * The selected entry lives in the URL, so a ladder rung is a link. The form
 * state does not: switching entries keeps every pending edit, because there
 * is one draft ladder behind both panes and one save that covers all of it.
 */

type RankingEditRow = Record<RankRewardType, string> & {
  threshold: string;
  movement: string;
  target: string;
};

/** The ladder as the form holds it: numbers and enums as input strings. */
type EntryDraft = {
  id: string;
  league: League | "";
  division: string;
  nameFr: string;
  nameEn: string;
  active: boolean;
  rows: RankingEditRow[];
};

function toEditRow(band: RankingEntry["bands"][number]): RankingEditRow {
  const quantity = (type: RankRewardType) =>
    String(band.rewards.find((item) => item.type === type)?.quantity ?? 0);
  return {
    threshold: String(band.threshold),
    movement: band.movement ?? "",
    target: band.target ?? "",
    sapphires: quantity("sapphires"),
    speedups: quantity("speedups"),
    gems: quantity("gems"),
  };
}

function toDraft(entry: RankingEntry): EntryDraft {
  return {
    id: entry.id,
    league: entry.league ?? "",
    division: entry.division,
    nameFr: entry.nameFr,
    nameEn: entry.nameEn,
    active: entry.active,
    rows: entry.bands.map(toEditRow),
  };
}

/**
 * Bloc 108/A: a fresh id that no existing entry already uses.
 *
 * Ids are what bands point at, so they are generated once, here, and never
 * recomputed afterwards — renaming an entry later must not silently
 * re-target every band that aimed at it.
 */
function uniqueEntryId(drafts: EntryDraft[], seed: Partial<EntryDraft>) {
  const base = rankingEntryId({
    league: (seed.league || null) as League | null,
    division: seed.division ?? "",
    nameFr: seed.nameFr ?? "",
    nameEn: seed.nameEn ?? "",
  });
  const taken = new Set(drafts.map((draft) => draft.id));
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1)
    if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
}

function serialise(drafts: EntryDraft[]): RankingLadder {
  // Bloc 108/B: order is a property of the list, not of when a row was
  // inserted — the position each entry ends up with is simply its index.
  return drafts.map((draft, index) => ({
    id: draft.id,
    league: (draft.league || null) as League | null,
    division: draft.division.trim(),
    nameFr: draft.nameFr.trim(),
    nameEn: draft.nameEn.trim(),
    position: index,
    active: draft.active,
    bands: draft.rows.map((row) => ({
      threshold: Number(row.threshold),
      movement: (row.movement || null) as RankMovement | null,
      target: row.target || null,
      rewards: rankRewardTypes
        .map((type) => ({ type, quantity: Number(row[type]) }))
        .filter((item) => item.quantity > 0),
    })),
  }));
}

/**
 * Bloc 131/C : ce qui empêche l'enregistrement, et où c'est.
 *
 * La validation était un message et rien d'autre : « Corrige les champs
 * signalés » — alors que rien n'était signalé, et que l'entrée fautive
 * pouvait être une de celles que le volet de droite ne montre pas. Sur un
 * écran maître/détail, un refus sans adresse est un refus muet.
 *
 * Le champ est décrit par ce qu'il est à l'écran, pas par le chemin dans les
 * données : c'est ce qui permet de le retrouver, de l'entourer et d'y poser
 * le curseur.
 */
type RankingField =
  | { kind: "identity" }
  | { kind: "threshold"; row: number }
  | { kind: "movement"; row: number }
  | { kind: "reward"; row: number; type: RankRewardType };

type RankingProblem = {
  /** L'entrée à ouvrir pour voir le champ. Vide quand rien n'est en cause. */
  entryId: string;
  field?: RankingField;
  /** La phrase déjà traduite, celle que le champ portera sous lui. */
  message: string;
  /** Où c'est, en toutes lettres, pour le bandeau du haut. */
  where?: string;
};

/** L'adresse d'un champ, pour comparer un problème à ce qu'on est en train de rendre. */
function fieldKey(entryId: string, field: RankingField) {
  const row = "row" in field ? field.row : "";
  const type = "type" in field ? field.type : "";
  return `${entryId}|${field.kind}|${row}|${type}`;
}

const movementTone: Record<RankMovement, string> = {
  promotion: "border-admin-ok-ink bg-admin-ok text-admin-ok-ink",
  stay: "border-admin-neutral-ink bg-admin-neutral text-admin-neutral-ink",
  relegation: "border-admin-danger-ink bg-admin-warn text-admin-danger-ink",
};

export function RankingAdminEditor({
  initialLadder,
  backHref,
  backLabel,
  title,
}: EditorScreenProps & { initialLadder: RankingLadder }) {
  const t = useTranslations("admin.ranking");
  const locale = useLocale();
  const game = useTranslations("game");
  const gameLeagues = useTranslations("game.leagues");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dragging, setDragging] = useState<string>();
  const [removing, setRemoving] = useState<EntryDraft>();

  const [showProblems, setShowProblems] = useState(false);
  // Le refus vient d'être prononcé : le curseur doit aller sur le premier
  // champ fautif, une fois son entrée à l'écran (elle peut être une autre
  // que celle qu'on regardait).
  const [focusPending, setFocusPending] = useState(false);
  const firstInvalid = useRef<HTMLElement | null>(null);
  const errorId = useId();

  const form = useEditorForm<EntryDraft[]>({
    initial: initialLadder.map(toDraft),
    endpoint: "/api/admin/tools/ranking",
    body: serialise,
    // Le bandeau du haut dit ce qui coince et où ; les champs eux-mêmes
    // portent le reste (§C). Les deux lisent la même liste.
    validate: (value) => summarise(findProblems(value)),
  });
  const drafts = form.value;

  const label = (draft: EntryDraft) =>
    rankingEntryLabel(
      {
        id: draft.id,
        league: (draft.league || null) as League | null,
        division: draft.division,
        nameFr: draft.nameFr,
        nameEn: draft.nameEn,
        position: 0,
        active: draft.active,
        bands: [],
      },
      game,
      locale,
    ) || t("entry-untitled");

  /**
   * Tout ce qui empêche l'enregistrement, dans l'ordre où on le lit à
   * l'écran : les entrées de haut en bas, et pour chacune l'identité puis
   * ses plages.
   *
   * Les règles sont celles que l'écran appliquait déjà ; ce qui change,
   * c'est qu'elles rendent une adresse au lieu d'un booléen. Le dernier
   * filet — `isSavableRankingLadder`, la fonction que la route utilise
   * aussi — reste consulté à la fin : s'il refuse une échelle qu'aucune
   * règle ci-dessus n'a attrapée, le message doit quand même apparaître
   * plutôt que laisser passer un enregistrement que le serveur refusera.
   */
  function findProblems(entries: EntryDraft[]): RankingProblem[] {
    const found: RankingProblem[] = [];
    const seen = new Set<string>();
    for (const draft of entries) {
      const name = label(draft);
      const identity = () => ({
        entryId: draft.id,
        field: { kind: "identity" } as const,
        where: t("entry-league-field", {
          entry: name,
          position: entries.indexOf(draft) + 1,
        }),
      });
      if (!draft.league && !draft.nameFr.trim() && !draft.nameEn.trim())
        found.push({ ...identity(), message: t("entry-name-error") });
      // Les identifiants sont générés uniques ; un doublon ne peut venir que
      // des données, et c'est l'entrée qui le répète qu'il faut ouvrir.
      else if (seen.has(draft.id))
        found.push({ ...identity(), message: t("duplicate-error") });
      seen.add(draft.id);

      draft.rows.forEach((row, index) => {
        const where = (field: string) =>
          t("row-label", { league: name, row: index + 1, field });
        const threshold = Number(row.threshold);
        if (
          row.threshold.trim() === "" ||
          !Number.isFinite(threshold) ||
          threshold <= 0 ||
          threshold > 100
        )
          found.push({
            entryId: draft.id,
            field: { kind: "threshold", row: index },
            message: t("range-error"),
            where: where(t("threshold")),
          });
        if (Boolean(row.movement) !== Boolean(row.target))
          found.push({
            entryId: draft.id,
            field: { kind: "movement", row: index },
            message: t("pairing-error"),
            where: where(t("movement")),
          });
        for (const type of rankRewardTypes) {
          const quantity = Number(row[type]);
          if (
            row[type].trim() === "" ||
            !Number.isInteger(quantity) ||
            quantity < 0
          )
            found.push({
              entryId: draft.id,
              field: { kind: "reward", row: index, type },
              message: t("integer-error"),
              where: where(t(`reward-types.${type}`)),
            });
        }
      });
    }
    if (found.length === 0 && !isSavableRankingLadder(serialise(entries)))
      found.push({ entryId: "", message: t("validation") });
    return found;
  }

  /** Ce que le bandeau du haut dit : combien, et le premier, en toutes lettres. */
  function summarise(found: RankingProblem[]) {
    if (found.length === 0) return undefined;
    const [first] = found;
    return first.where
      ? t("save-blocked", {
          count: found.length,
          where: first.where,
          message: first.message,
        })
      : first.message;
  }

  const problems = findProblems(drafts);
  const marked = new Map(
    showProblems
      ? problems.flatMap((problem) =>
          problem.field
            ? [[fieldKey(problem.entryId, problem.field), problem.message]]
            : [],
        )
      : [],
  );
  const firstKey =
    showProblems && problems[0]?.field
      ? fieldKey(problems[0].entryId, problems[0].field)
      : undefined;

  const selectedId = searchParams.get("entry");
  const selectedIndex = Math.max(
    0,
    drafts.findIndex((draft) => draft.id === selectedId),
  );
  const selected = drafts[selectedIndex];

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("entry", id);
    router.replace(`/admin/tools/ranking?${params.toString()}`);
  }

  /**
   * Bloc 131/C : enregistrer, ou dire où ça coince.
   *
   * L'écran est un maître/détail, et le champ fautif est souvent dans une
   * entrée que le volet de droite ne montre pas : le refus commence donc par
   * l'ouvrir. Le message, lui, vient de `useEditorForm`, qui rejoue la même
   * validation — une seule liste de problèmes pour le bandeau et pour les
   * champs.
   */
  function saveOrShowProblems() {
    const found = findProblems(drafts);
    setShowProblems(found.length > 0);
    const [first] = found;
    if (first?.field) {
      if (first.entryId !== selected?.id) select(first.entryId);
      setFocusPending(true);
    }
    void form.save();
  }

  // Le curseur suit, une fois l'entrée fautive rendue. `selectedIndex` est
  // dans les dépendances parce que l'ouverture passe par l'URL : au tour où
  // le refus est prononcé, le champ n'est pas encore à l'écran.
  useEffect(() => {
    if (!focusPending) return;
    const field = firstInvalid.current;
    if (!field) return;
    field.focus();
    setFocusPending(false);
  }, [focusPending, selectedIndex]);

  const updateDraft = (id: string, patch: Partial<EntryDraft>) =>
    form.setValue((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    );

  const move = (index: number, direction: -1 | 1) =>
    form.setValue((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  /** Drops the entry being dragged just before `index` in the list. */
  function dropOn(index: number) {
    form.setValue((current) => {
      const from = current.findIndex((draft) => draft.id === dragging);
      if (from < 0 || from === index) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragging(undefined);
  }

  function addEntry() {
    // Seeded with no name at all, so the heading follows the base league and
    // division as soon as they are picked. The id is opaque on purpose: it is
    // generated once, before the entry has anything to be named after, and it
    // must not move afterwards because bands may already point at it.
    const id = uniqueEntryId(drafts, {});
    form.setValue((current) => [
      ...current,
      {
        id,
        league: "",
        division: "",
        nameFr: "",
        nameEn: "",
        // Bloc 108/G: off until an admin says otherwise — a new rung is being
        // prepared, not published.
        active: false,
        rows: [],
      },
    ]);
    select(id);
  }

  // Bloc 108/A: every entry currently on the ladder is a possible target,
  // including the ones being created in this very form.
  const targetOptions = [
    { value: "", label: t("unconfirmed-option") },
    ...drafts.map((draft) => ({ value: draft.id, label: label(draft) })),
  ];

  /** Ce que la validation reproche à ce champ de l'entrée ouverte, s'il y a. */
  const problemOn = (field: RankingField) =>
    selected ? marked.get(fieldKey(selected.id, field)) : undefined;

  /** Le champ où le curseur doit aller : le premier de la liste, et lui seul. */
  const isFirstInvalid = (field: RankingField) =>
    Boolean(selected) && firstKey === fieldKey(selected.id, field);

  /**
   * Une ref de rappel plutôt qu'une ref d'objet : le premier champ fautif
   * est tantôt un <input>, tantôt un <select>, tantôt un bouton, et une
   * seule ref d'objet ne peut pas être les trois. Stable d'un rendu à
   * l'autre, pour n'être posée et retirée que quand le champ visé change.
   */
  const keepFirstInvalid = useCallback((node: HTMLElement | null) => {
    firstInvalid.current = node;
  }, []);

  /** La ref à poser sur ce champ, ou rien. */
  const captureFirstInvalid = (field: RankingField) =>
    isFirstInvalid(field) ? keepFirstInvalid : undefined;

  const setRow = (index: number, patch: Partial<RankingEditRow>) =>
    updateDraft(selected.id, {
      rows: selected.rows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });

  return (
    <div className="flex flex-col gap-6">
      <EditorHeader
        backHref={backHref}
        backLabel={backLabel}
        title={title}
        description={t("description")}
        dirty={form.dirty}
        saving={form.saving}
        onSave={saveOrShowProblems}
        onCancel={() => {
          setShowProblems(false);
          form.cancel();
        }}
        message={form.message}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label={t("entries-label")}
          className="flex w-full shrink-0 flex-col gap-2 lg:w-[250px]"
        >
          <ul className="flex flex-col gap-1">
            {drafts.map((draft, index) => (
              <li
                key={draft.id}
                draggable
                onDragStart={() => setDragging(draft.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(index)}
                onDragEnd={() => setDragging(undefined)}
              >
                <button
                  type="button"
                  aria-current={draft.id === selected?.id ? "true" : undefined}
                  className={cn(
                    "admin-focus flex w-full items-center gap-2 rounded-admin-control border px-3 py-2 text-left text-sm",
                    draft.id === selected?.id
                      ? "border-admin-accent bg-admin-accent-soft text-admin-accent-soft-ink"
                      : "border-admin-card-border bg-admin-card text-admin-text hover:border-admin-accent",
                  )}
                  onClick={() => select(draft.id)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      draft.active ? "bg-admin-ok-ink" : "bg-admin-rule",
                    )}
                  />
                  <span
                    className="min-w-0 flex-1 truncate font-semibold"
                    data-testid="ranking-entry-name"
                  >
                    {label(draft)}
                  </span>
                  <span className="text-xs text-admin-dim">
                    {t("band-count", { count: draft.rows.length })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <AdminButton type="button" onClick={addEntry}>
            {t("add-entry")}
          </AdminButton>
        </nav>

        {selected && (
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <EditorSection
              title={label(selected)}
              description={t("entry-position", {
                position: selectedIndex + 1,
                total: drafts.length,
              })}
              actions={
                <>
                  <VisibilitySwitch
                    checked={selected.active}
                    label={t("entry-active-field", {
                      entry: label(selected),
                      position: selectedIndex + 1,
                    })}
                    labels={{ on: t("entry-public"), off: t("entry-private") }}
                    onChange={(next) =>
                      updateDraft(selected.id, { active: next })
                    }
                  />
                  <OverflowMenu
                    label={t("entry-actions", { entry: label(selected) })}
                    items={[
                      {
                        key: "up",
                        label: t("move-up", { entry: label(selected) }),
                        disabled: selectedIndex === 0,
                        onSelect: () => move(selectedIndex, -1),
                      },
                      {
                        key: "down",
                        label: t("move-down", { entry: label(selected) }),
                        disabled: selectedIndex === drafts.length - 1,
                        onSelect: () => move(selectedIndex, 1),
                      },
                      {
                        key: "remove",
                        label: t("remove-entry-label"),
                        tone: "danger",
                        onSelect: () => setRemoving(selected),
                      },
                    ]}
                  />
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
                  {t("entry-league")}
                  {/* §C : une entrée sans ligue ni nom libre n'a pas
                      d'identité, et c'est ici qu'on lui en donne une. Le
                      contour rouge et la phrase sous le champ disent ce que
                      le refus reprochait sans jamais le montrer. */}
                  <select
                    ref={captureFirstInvalid({ kind: "identity" })}
                    aria-label={t("entry-league-field", {
                      entry: label(selected),
                      position: selectedIndex + 1,
                    })}
                    aria-invalid={
                      problemOn({ kind: "identity" }) ? true : undefined
                    }
                    aria-describedby={
                      problemOn({ kind: "identity" })
                        ? `${errorId}-identity`
                        : undefined
                    }
                    className={cn(
                      "admin-control admin-focus h-9 rounded-admin-control border bg-admin-card px-2 text-sm",
                      problemOn({ kind: "identity" })
                        ? "border-admin-danger-ink text-admin-danger-ink"
                        : "border-admin-card-border text-admin-text",
                    )}
                    value={selected.league}
                    onChange={(event) =>
                      updateDraft(selected.id, {
                        league: event.target.value as League | "",
                      })
                    }
                  >
                    <option value="">{t("entry-no-league")}</option>
                    {leagues.map((league) => (
                      <option key={league} value={league}>
                        {gameLeagues(league)}
                      </option>
                    ))}
                  </select>
                  {problemOn({ kind: "identity" }) && (
                    <span
                      className="text-xs text-admin-danger-ink"
                      id={`${errorId}-identity`}
                    >
                      {problemOn({ kind: "identity" })}
                    </span>
                  )}
                </label>
                <TextField
                  label={t("entry-division")}
                  accessibleName={t("entry-division-field", {
                    entry: label(selected),
                    position: selectedIndex + 1,
                  })}
                  value={selected.division}
                  onChange={(division) =>
                    updateDraft(selected.id, { division })
                  }
                />
                {/* Codex review (PR #135): a free name is admin-managed text
                    that reaches every reader, so it is stored per locale and
                    read with pickFrEn — the same fr/en pair the Templiers
                    presentation uses, with English as the fallback. */}
                {(["Fr", "En"] as const).map((suffix) => (
                  <TextField
                    key={suffix}
                    label={t(`entry-name-${suffix.toLowerCase()}`)}
                    accessibleName={t(
                      `entry-name-${suffix.toLowerCase()}-field`,
                      {
                        entry: label(selected),
                        position: selectedIndex + 1,
                      },
                    )}
                    value={selected[`name${suffix}`]}
                    onChange={(value) =>
                      updateDraft(selected.id, { [`name${suffix}`]: value })
                    }
                  />
                ))}
              </div>
            </EditorSection>

            <EditorSection
              title={t("bands-section")}
              actions={
                <AdminButton
                  type="button"
                  size="sm"
                  onClick={() =>
                    updateDraft(selected.id, {
                      rows: [
                        ...selected.rows,
                        {
                          threshold: "100",
                          movement: "",
                          target: "",
                          sapphires: "0",
                          speedups: "0",
                          gems: "0",
                        },
                      ],
                    })
                  }
                >
                  {t("add")}
                </AdminButton>
              }
            >
              {selected.rows.length === 0 ? (
                <p className="text-sm text-admin-dim">{t("empty")}</p>
              ) : (
                <div className="overflow-x-auto rounded-admin-card border border-admin-card-border">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">{t("bands-section")}</caption>
                    <thead className="bg-admin-head">
                      <tr className="border-b border-admin-rule">
                        <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                          {t("threshold")}
                        </th>
                        <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                          {t("movement")}
                        </th>
                        <th className="admin-column-head px-3 py-2 text-left text-admin-dim">
                          {t("target")}
                        </th>
                        {rankRewardTypes.map((type) => (
                          <th
                            key={type}
                            className="admin-column-head px-3 py-2 text-right text-admin-dim"
                          >
                            {t(`reward-types.${type}`)}
                          </th>
                        ))}
                        <th className="admin-column-head px-3 py-2 text-right text-admin-dim">
                          {t("row-actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rows.map((row, index) => {
                        const rowLabel = (field: string) =>
                          t("row-label", {
                            league: label(selected),
                            row: index + 1,
                            field,
                          });
                        return (
                          <tr
                            key={index}
                            className="h-[var(--admin-row-h-edit)] border-b border-admin-rule-soft last:border-0"
                          >
                            <td className="px-3">
                              <span className="flex items-center gap-1.5">
                                <span className="text-xs text-admin-dim">
                                  {t("top")}
                                </span>
                                <NumberField
                                  label={rowLabel(t("threshold"))}
                                  hideLabel
                                  width="s"
                                  unit="%"
                                  invalid={Boolean(
                                    problemOn({
                                      kind: "threshold",
                                      row: index,
                                    }),
                                  )}
                                  invalidMessage={problemOn({
                                    kind: "threshold",
                                    row: index,
                                  })}
                                  fieldRef={captureFirstInvalid({
                                    kind: "threshold",
                                    row: index,
                                  })}
                                  value={
                                    row.threshold === ""
                                      ? null
                                      : Number(row.threshold)
                                  }
                                  onChange={(next) =>
                                    setRow(index, {
                                      threshold:
                                        next === null ? "" : String(next),
                                    })
                                  }
                                />
                              </span>
                            </td>
                            <td className="px-3">
                              {/* §C : le mouvement et la cible vont par
                                  paire, et c'est la paire qui est refusée —
                                  le contour tient donc le groupe entier,
                                  pas l'un de ses trois boutons. */}
                              <div
                                aria-label={rowLabel(t("movement"))}
                                aria-invalid={
                                  problemOn({ kind: "movement", row: index })
                                    ? true
                                    : undefined
                                }
                                aria-describedby={
                                  problemOn({ kind: "movement", row: index })
                                    ? `${errorId}-movement-${index}`
                                    : undefined
                                }
                                className={cn(
                                  "flex gap-1 rounded-admin-control border border-transparent",
                                  problemOn({
                                    kind: "movement",
                                    row: index,
                                  }) && "border-admin-danger-ink p-1",
                                )}
                                role="radiogroup"
                              >
                                {rankMovements.map((movement) => (
                                  <button
                                    key={movement}
                                    ref={
                                      movement === rankMovements[0]
                                        ? captureFirstInvalid({
                                            kind: "movement",
                                            row: index,
                                          })
                                        : undefined
                                    }
                                    type="button"
                                    role="radio"
                                    aria-checked={row.movement === movement}
                                    className={cn(
                                      "admin-focus rounded-admin-control border px-2 py-1 text-xs font-semibold",
                                      row.movement === movement
                                        ? movementTone[movement]
                                        : "border-admin-card-border text-admin-dim",
                                    )}
                                    onClick={() =>
                                      setRow(index, {
                                        // Clicking the chosen one again
                                        // clears it: a band with no confirmed
                                        // movement is a real state.
                                        movement:
                                          row.movement === movement
                                            ? ""
                                            : movement,
                                      })
                                    }
                                  >
                                    {t(`movements.${movement}`)}
                                  </button>
                                ))}
                              </div>
                              {problemOn({ kind: "movement", row: index }) && (
                                <span
                                  className="block text-xs text-admin-danger-ink"
                                  id={`${errorId}-movement-${index}`}
                                >
                                  {problemOn({ kind: "movement", row: index })}
                                </span>
                              )}
                            </td>
                            <td className="px-3">
                              <select
                                aria-label={rowLabel(t("target"))}
                                className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
                                value={row.target}
                                onChange={(event) =>
                                  setRow(index, { target: event.target.value })
                                }
                              >
                                {targetOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {rankRewardTypes.map((type) => (
                              <td key={type} className="px-3 text-right">
                                <NumberField
                                  label={rowLabel(t(`reward-types.${type}`))}
                                  hideLabel
                                  width="s"
                                  invalid={Boolean(
                                    problemOn({
                                      kind: "reward",
                                      row: index,
                                      type,
                                    }),
                                  )}
                                  invalidMessage={problemOn({
                                    kind: "reward",
                                    row: index,
                                    type,
                                  })}
                                  fieldRef={captureFirstInvalid({
                                    kind: "reward",
                                    row: index,
                                    type,
                                  })}
                                  value={
                                    row[type] === "" ? null : Number(row[type])
                                  }
                                  onChange={(next) =>
                                    setRow(index, {
                                      [type]: next === null ? "" : String(next),
                                    })
                                  }
                                />
                              </td>
                            ))}
                            <td className="px-3">
                              <RowActions
                                // The band, not one of its fields (see the
                                // Événements editor for the same reason).
                                name={t("band-name", {
                                  entry: label(selected),
                                  row: index + 1,
                                })}
                                onRemove={() =>
                                  updateDraft(selected.id, {
                                    rows: selected.rows.filter(
                                      (_, i) => i !== index,
                                    ),
                                  })
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </EditorSection>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removing !== undefined}
        title={t("remove-entry-label")}
        description={t("remove-entry-confirm")}
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => {
          const target = removing;
          setRemoving(undefined);
          if (!target) return;
          form.setValue((current) =>
            current.filter((item) => item.id !== target.id),
          );
        }}
      />
    </div>
  );
}

function TextField({
  label,
  accessibleName,
  value,
  onChange,
}: {
  label: string;
  accessibleName: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-admin-dim">
      {label}
      <input
        aria-label={accessibleName}
        className="admin-control admin-focus h-9 rounded-admin-control border border-admin-card-border bg-admin-card px-2 text-sm text-admin-text"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
