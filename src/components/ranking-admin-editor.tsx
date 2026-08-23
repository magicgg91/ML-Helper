"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EditableDataTable,
  type EditableColumn,
} from "./editable-reference-table";
import {
  rankingLeagues,
  type RankingConfig,
  type RankingLeague,
} from "../lib/ranking";
import { EditorActionBar } from "./editor-action-bar";

type RankingEditRow = Record<string, string> & {
  threshold: string;
  target: string;
  reward: string;
};

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
          initialConfig[league].map((row) => ({
            threshold: String(row.threshold),
            target: row.target,
            reward: row.reward,
          })),
        ]),
      ) as Record<RankingLeague, RankingEditRow[]>,
  );
  const [message, setMessage] = useState("");
  const [hasValidationError, setHasValidationError] = useState(false);
  const baseColumns: EditableColumn<RankingEditRow>[] = [
    {
      key: "threshold",
      label: t("threshold"),
      type: "number",
      min: 0.01,
      step: 0.01,
      required: true,
    },
    { key: "target", label: t("target"), required: true },
    { key: "reward", label: t("reward"), required: true },
  ];
  async function save() {
    const invalid = rankingLeagues.some((league) =>
      config[league].some(
        (row) =>
          !Number.isFinite(Number(row.threshold)) ||
          Number(row.threshold) <= 0 ||
          Number(row.threshold) > 100 ||
          !row.target.trim() ||
          !row.reward.trim(),
      ),
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
            ...row,
            threshold: Number(row.threshold),
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
                    { threshold: "100", target: "", reward: "" },
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
