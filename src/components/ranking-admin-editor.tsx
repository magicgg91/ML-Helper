"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EditableDataTable,
  type EditableColumn,
} from "./editable-reference-table";
import {
  rankingLeagues,
  rankMovements,
  rankRewardTypes,
  type RankingConfig,
  type RankingLeague,
  type RankMovement,
  type RankRewardType,
} from "../lib/ranking";
import { EditorActionBar } from "./editor-action-bar";

type RankingEditRow = Record<string, string> & {
  threshold: string;
  movement: string;
  league: string;
  sapphires: string;
  speedups: string;
  gems: string;
};

function toEditRow(band: RankingConfig[RankingLeague][number]): RankingEditRow {
  const quantity = (type: RankRewardType) =>
    String(band.rewards.find((item) => item.type === type)?.quantity ?? 0);
  return {
    threshold: String(band.threshold),
    movement: band.movement ?? "",
    league: band.league ?? "",
    sapphires: quantity("sapphires"),
    speedups: quantity("speedups"),
    gems: quantity("gems"),
  };
}

export function RankingAdminEditor({
  initialConfig,
}: {
  initialConfig: RankingConfig;
}) {
  const t = useTranslations("admin.ranking");
  const leagues = useTranslations("game.leagues");
  const [config, setConfig] = useState<Record<RankingLeague, RankingEditRow[]>>(
    () =>
      Object.fromEntries(
        rankingLeagues.map((league) => [
          league,
          initialConfig[league].map(toEditRow),
        ]),
      ) as Record<RankingLeague, RankingEditRow[]>,
  );
  const [message, setMessage] = useState("");
  const [hasValidationError, setHasValidationError] = useState(false);
  const leagueOptions = [
    { value: "", label: t("unconfirmed-option") },
    ...rankingLeagues.map((league) => ({ value: league, label: leagues(league) })),
  ];
  const baseColumns: EditableColumn<RankingEditRow>[] = [
    {
      key: "threshold",
      label: t("threshold"),
      type: "number",
      min: 0.01,
      step: 0.01,
      required: true,
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
    { key: "league", label: t("target"), type: "select", options: leagueOptions },
    {
      key: "sapphires",
      label: t("reward-types.sapphires"),
      type: "number",
      min: 0,
      step: 1,
    },
    {
      key: "speedups",
      label: t("reward-types.speedups"),
      type: "number",
      min: 0,
      step: 1,
    },
    { key: "gems", label: t("reward-types.gems"), type: "number", min: 0, step: 1 },
  ];
  async function save() {
    const invalid = rankingLeagues.some((league) =>
      config[league].some((row) => {
        const threshold = Number(row.threshold);
        if (
          !Number.isFinite(threshold) ||
          threshold <= 0 ||
          threshold > 100
        )
          return true;
        // Movement and target league are confirmed together, or not at all.
        return Boolean(row.movement) !== Boolean(row.league);
      }),
    );
    if (invalid) {
      setHasValidationError(true);
      return setMessage(t("validation"));
    }
    setHasValidationError(false);
    setMessage(t("saving"));
    try {
      const payload = Object.fromEntries(
        rankingLeagues.map((league) => [
          league,
          config[league].map((row) => ({
            threshold: Number(row.threshold),
            movement: (row.movement || null) as RankMovement | null,
            league: (row.league || null) as RankingLeague | null,
            rewards: rankRewardTypes
              .map((type) => ({ type, quantity: Number(row[type]) }))
              .filter((item) => item.quantity > 0),
          })),
        ]),
      );
      const response = await fetch("/api/admin/tools/ranking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage(
        response.ok ? t("saved") : t("save-error", { status: response.status }),
      );
    } catch {
      setMessage(t("server-error"));
    }
  }
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
      {hasValidationError && <p className="field-error">{t("range-error")}</p>}
      <p>{t("description")}</p>
      {rankingLeagues.map((league) => {
        const columns = baseColumns.map((column) => ({
          ...column,
          inputLabel: (index: number) =>
            t("row-label", {
              league: leagues(league),
              row: index + 1,
              field: column.label,
            }),
        }));
        return (
          <section className="admin-panel" key={league}>
            <h2>{leagues(league)}</h2>
            <EditableDataTable
              rows={config[league]}
              columns={columns}
              onChange={(rows) =>
                setConfig((current) => ({ ...current, [league]: rows }))
              }
              onAdd={() =>
                setConfig((current) => ({
                  ...current,
                  [league]: [
                    ...current[league],
                    {
                      threshold: "100",
                      movement: "",
                      league: "",
                      sapphires: "0",
                      speedups: "0",
                      gems: "0",
                    },
                  ],
                }))
              }
              onRemove={(index) =>
                setConfig((current) => ({
                  ...current,
                  [league]: current[league].filter(
                    (_, rowIndex) => rowIndex !== index,
                  ),
                }))
              }
              addLabel={t("add")}
              removeLabel={t("remove")}
              emptyLabel={t("empty")}
            />
          </section>
        );
      })}
    </div>
  );
}
