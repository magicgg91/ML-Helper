"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EditableDataTable,
  errorKey,
  type EditableColumn,
  type FieldErrors,
} from "./editable-reference-table";
import {
  isSavableRankingLadder,
  rankingEntryId,
  rankMovements,
  rankRewardTypes,
  type RankingEntry,
  type RankingLadder,
  type RankMovement,
  type RankRewardType,
} from "../lib/ranking";
import { leagues, type League } from "../lib/player-settings";
import { EditorActionBar } from "./editor-action-bar";
import { rankingEntryLabel } from "./ranking-calculator";

type RankingEditRow = Record<string, string> & {
  threshold: string;
  movement: string;
  target: string;
  sapphires: string;
  speedups: string;
  gems: string;
};

/** The ladder as the form holds it: numbers and enums as input strings. */
type EntryDraft = {
  id: string;
  league: League | "";
  division: string;
  name: string;
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
    name: entry.name,
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
    name: seed.name ?? "",
  });
  const taken = new Set(drafts.map((draft) => draft.id));
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1)
    if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
}

export function RankingAdminEditor({
  initialLadder,
}: {
  initialLadder: RankingLadder;
}) {
  const t = useTranslations("admin.ranking");
  const game = useTranslations("game");
  const gameLeagues = useTranslations("game.leagues");
  const [drafts, setDrafts] = useState<EntryDraft[]>(() =>
    initialLadder.map(toDraft),
  );
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldErrors>>(
    {},
  );
  const [entryErrors, setEntryErrors] = useState<Record<string, string>>({});

  const label = (draft: EntryDraft) =>
    rankingEntryLabel(
      {
        id: draft.id,
        league: (draft.league || null) as League | null,
        division: draft.division,
        name: draft.name,
        position: 0,
        active: draft.active,
        bands: [],
      },
      game,
    ) || t("entry-untitled");

  const updateDraft = (id: string, patch: Partial<EntryDraft>) =>
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    );

  // Bloc 108/B: order is a property of the list, not of when a row was
  // inserted — moving an entry rewrites nothing else, and the position each
  // one ends up with is simply its index when the ladder is serialised.
  const moveEntry = (index: number, direction: -1 | 1) =>
    setDrafts((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  function serialise(): RankingLadder {
    return drafts.map((draft, index) => ({
      id: draft.id,
      league: (draft.league || null) as League | null,
      division: draft.division.trim(),
      name: draft.name.trim(),
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

  async function save() {
    const errors: Record<string, FieldErrors> = {};
    const perEntry: Record<string, string> = {};
    let invalid = false;
    for (const draft of drafts) {
      errors[draft.id] = {};
      // An entry with neither a base league nor a name could not be labelled
      // in any language — the one thing a ladder rung cannot do without.
      if (!draft.league && !draft.name.trim()) {
        perEntry[draft.id] = t("entry-name-error");
        invalid = true;
      }
      draft.rows.forEach((row, index) => {
        const threshold = Number(row.threshold);
        if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) {
          errors[draft.id][errorKey(index, "threshold")] = t("range-error");
          invalid = true;
        }
        // Movement and target are confirmed together, or not at all.
        if (Boolean(row.movement) !== Boolean(row.target)) {
          errors[draft.id][errorKey(index, "movement")] = t("pairing-error");
          errors[draft.id][errorKey(index, "target")] = t("pairing-error");
          invalid = true;
        }
        for (const type of rankRewardTypes) {
          const quantity = Number(row[type]);
          if (!Number.isInteger(quantity) || quantity < 0) {
            errors[draft.id][errorKey(index, type)] = t("integer-error");
            invalid = true;
          }
        }
      });
    }
    setFieldErrors(errors);
    setEntryErrors(perEntry);
    if (invalid) return setMessage(t("validation"));
    const ladder = serialise();
    if (!isSavableRankingLadder(ladder)) return setMessage(t("validation"));
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/tools/ranking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ladder),
      });
      setMessage(
        response.ok ? t("saved") : t("save-error", { status: response.status }),
      );
    } catch {
      setMessage(t("server-error"));
    }
  }

  // Bloc 108/A: every entry currently on the ladder is a possible target,
  // including the ones being created in this very form — so a new division
  // can be promoted into before it has ever been saved.
  const targetOptions = [
    { value: "", label: t("unconfirmed-option") },
    ...drafts.map((draft) => ({ value: draft.id, label: label(draft) })),
  ];

  return (
    <div className="ranking-admin-editor">
      <EditorActionBar backHref="/admin/tools" message={message}>
        <button
          className="editor-action editor-action-primary"
          type="button"
          onClick={save}
        >
          {t("save")}
        </button>
      </EditorActionBar>
      <p>{t("description")}</p>
      {drafts.map((draft, index) => {
        const baseColumns: EditableColumn<RankingEditRow>[] = [
          {
            key: "threshold",
            label: t("threshold"),
            type: "number",
            min: 0.01,
            step: 0.01,
            required: true,
            narrow: true,
          },
          {
            key: "movement",
            label: t("movement"),
            type: "select",
            options: [
              { value: "", label: t("unconfirmed-option") },
              ...rankMovements.map((movement) => ({
                value: movement,
                label: t(`movements.${movement}`),
              })),
            ],
          },
          {
            key: "target",
            label: t("target"),
            type: "select",
            options: targetOptions,
          },
          ...rankRewardTypes.map((type) => ({
            key: type,
            label: t(`reward-types.${type}`),
            type: "number" as const,
            min: 0,
            step: 1,
            narrow: true,
          })),
        ];
        const columns = baseColumns.map((column) => ({
          ...column,
          inputLabel: (row: number) =>
            t("row-label", {
              league: label(draft),
              row: row + 1,
              field: column.label,
            }),
        }));
        return (
          <section className="admin-panel" key={draft.id}>
            <div className="ranking-entry-header">
              <h2>{label(draft)}</h2>
              <div className="ranking-entry-actions">
                <button
                  type="button"
                  onClick={() => moveEntry(index, -1)}
                  disabled={index === 0}
                  aria-label={t("move-up", { entry: label(draft) })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveEntry(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label={t("move-down", { entry: label(draft) })}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="editor-action-danger"
                  aria-label={t("remove-entry", { entry: label(draft) })}
                  onClick={() => {
                    if (!window.confirm(t("remove-entry-confirm"))) return;
                    setDrafts((current) =>
                      current.filter((item) => item.id !== draft.id),
                    );
                  }}
                >
                  {t("remove-entry-label")}
                </button>
              </div>
            </div>
            <div className="calculator-fields ranking-entry-fields">
              <label className="calculator-field">
                {t("entry-league")}
                <select
                  aria-label={t("entry-league-field", {
                    entry: label(draft),
                    position: index + 1,
                  })}
                  value={draft.league}
                  onChange={(event) =>
                    updateDraft(draft.id, {
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
              </label>
              <label className="calculator-field">
                {t("entry-division")}
                <input
                  type="text"
                  aria-label={t("entry-division-field", {
                    entry: label(draft),
                    position: index + 1,
                  })}
                  value={draft.division}
                  onChange={(event) =>
                    updateDraft(draft.id, { division: event.target.value })
                  }
                />
              </label>
              <label className="calculator-field">
                {t("entry-name")}
                <input
                  type="text"
                  aria-label={t("entry-name-field", {
                    entry: label(draft),
                    position: index + 1,
                  })}
                  value={draft.name}
                  onChange={(event) =>
                    updateDraft(draft.id, { name: event.target.value })
                  }
                />
              </label>
              <label className="calculator-field ranking-entry-active">
                <input
                  type="checkbox"
                  aria-label={t("entry-active-field", {
                    entry: label(draft),
                    position: index + 1,
                  })}
                  checked={draft.active}
                  onChange={(event) =>
                    updateDraft(draft.id, { active: event.target.checked })
                  }
                />
                {t("entry-active")}
              </label>
            </div>
            {entryErrors[draft.id] ? (
              <p className="field-error">{entryErrors[draft.id]}</p>
            ) : null}
            <EditableDataTable
              rows={draft.rows}
              columns={columns}
              testIdPrefix={draft.id}
              onChange={(rows) => updateDraft(draft.id, { rows })}
              onAdd={() =>
                updateDraft(draft.id, {
                  rows: [
                    ...draft.rows,
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
              onRemove={(rowIndex) =>
                updateDraft(draft.id, {
                  rows: draft.rows.filter((_, i) => i !== rowIndex),
                })
              }
              addLabel={t("add")}
              removeLabel={t("remove")}
              emptyLabel={t("empty")}
              errors={fieldErrors[draft.id] ?? {}}
            />
          </section>
        );
      })}
      <button
        type="button"
        className="editor-action"
        onClick={() =>
          setDrafts((current) => [
            ...current,
            {
              // Seeded with no name at all, so the heading follows the base
              // league and division as soon as they are picked — a seeded
              // name would win over them and have to be cleared by hand. The
              // id is opaque on purpose: it is generated once, here, before
              // the entry has anything to be named after, and it must not
              // move afterwards because bands may already point at it.
              id: uniqueEntryId(current, {}),
              league: "",
              division: "",
              name: "",
              // Bloc 108/G: off until an admin says otherwise — a new rung is
              // being prepared, not published.
              active: false,
              rows: [],
            },
          ])
        }
      >
        {t("add-entry")}
      </button>
    </div>
  );
}
