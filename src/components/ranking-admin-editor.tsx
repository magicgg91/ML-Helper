"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  rankingLeagues,
  type RankingBand,
  type RankingConfig,
  type RankingLeague,
} from "../lib/ranking";

export function RankingAdminEditor({
  initialConfig,
}: {
  initialConfig: RankingConfig;
}) {
  const t = useTranslations("admin.ranking");
  const leagues = useTranslations("game.leagues");
  const [config, setConfig] = useState(() => structuredClone(initialConfig));
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);

  function update(
    league: RankingLeague,
    index: number,
    field: keyof RankingBand,
    value: string,
  ) {
    setConfig((current) => ({
      ...current,
      [league]: current[league].map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: field === "threshold" ? Number(value) : value }
          : row,
      ),
    }));
    setMessage("");
    setInvalid((current) =>
      current.filter((key) => key !== `${league}-${index}-${field}`),
    );
  }

  function add(league: RankingLeague) {
    setConfig((current) => ({
      ...current,
      [league]: [
        ...current[league],
        { threshold: 100, target: "", reward: "" },
      ],
    }));
  }

  function remove(league: RankingLeague, index: number) {
    setConfig((current) => ({
      ...current,
      [league]: current[league].filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  async function save() {
    const errors: string[] = [];
    rankingLeagues.forEach((league) =>
      config[league].forEach((row, index) => {
        if (
          !Number.isFinite(row.threshold) ||
          row.threshold <= 0 ||
          row.threshold > 100
        )
          errors.push(`${league}-${index}-threshold`);
        if (!row.target.trim()) errors.push(`${league}-${index}-target`);
        if (!row.reward.trim()) errors.push(`${league}-${index}-reward`);
      }),
    );
    setInvalid(errors);
    if (errors.length) {
      setMessage(t("validation"));
      return;
    }
    setMessage(t("saving"));
    try {
      const response = await fetch("/api/admin/ranking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        setMessage(t("save-error", { status: response.status }));
        return;
      }
      setMessage(t("saved"));
    } catch {
      setMessage(t("server-error"));
    }
  }

  return (
    <div className="ranking-admin-editor">
      <p>{t("description")}</p>
      {rankingLeagues.map((league) => (
        <section className="admin-panel" key={league}>
          <div className="admin-section-heading">
            <h2>{leagues(league)}</h2>
            <button
              className="secondary-action"
              type="button"
              onClick={() => add(league)}
            >
              {t("add")}
            </button>
          </div>
          {config[league].length ? (
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>{t("threshold")}</th>
                    <th>{t("target")}</th>
                    <th>{t("reward")}</th>
                    <th>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {config[league].map((row, index) => (
                    <tr key={index}>
                      {(["threshold", "target", "reward"] as const).map(
                        (field) => {
                          const key = `${league}-${index}-${field}`;
                          return (
                            <td key={field}>
                              <input
                                aria-label={t("row-label", {
                                  league: leagues(league),
                                  row: index + 1,
                                  field: t(field),
                                })}
                                aria-invalid={invalid.includes(key)}
                                className={
                                  invalid.includes(key)
                                    ? "field-invalid"
                                    : undefined
                                }
                                type={field === "threshold" ? "number" : "text"}
                                min={field === "threshold" ? 0.01 : undefined}
                                max={field === "threshold" ? 100 : undefined}
                                step={field === "threshold" ? 0.01 : undefined}
                                value={row[field]}
                                onChange={(event) =>
                                  update(
                                    league,
                                    index,
                                    field,
                                    event.target.value,
                                  )
                                }
                              />
                              {invalid.includes(key) && (
                                <small className="field-error">
                                  {field === "threshold"
                                    ? t("range-error")
                                    : t("required")}
                                </small>
                              )}
                            </td>
                          );
                        },
                      )}
                      <td>
                        <button
                          className="secondary-action"
                          type="button"
                          onClick={() => remove(league, index)}
                        >
                          {t("remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty">{t("empty")}</p>
          )}
        </section>
      ))}
      <button className="primary-button" type="button" onClick={save}>
        {t("save")}
      </button>
      {message && (
        <p
          className={
            message === t("saved") ? "form-success" : "form-status"
          }
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
