"use client";

import { useState } from "react";
import {
  rankingLeagues,
  type RankingBand,
  type RankingConfig,
  type RankingLeague,
} from "../lib/ranking";

const labels: Record<RankingLeague, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
  legend: "Légende",
};

export function RankingAdminEditor({
  initialConfig,
}: {
  initialConfig: RankingConfig;
}) {
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
      setMessage("Corrige les champs signalés avant l’enregistrement.");
      return;
    }
    setMessage("Enregistrement…");
    try {
      const response = await fetch("/api/admin/ranking", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMessage(
          `Échec de l’enregistrement${payload?.error ? ` : ${payload.error}` : ` (HTTP ${response.status})`}.`,
        );
        return;
      }
      setMessage("Configuration enregistrée.");
    } catch {
      setMessage("Impossible de joindre le serveur. Réessaie plus tard.");
    }
  }

  return (
    <div className="ranking-admin-editor">
      <p>
        Édite chaque plage individuellement. Bronze et Or peuvent rester sans
        ligne tant que leurs données ne sont pas confirmées.
      </p>
      {rankingLeagues.map((league) => (
        <section className="admin-panel" key={league}>
          <div className="admin-section-heading">
            <h2>{labels[league]}</h2>
            <button
              className="secondary-action"
              type="button"
              onClick={() => add(league)}
            >
              Ajouter une plage
            </button>
          </div>
          {config[league].length ? (
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Seuil (%)</th>
                    <th>Ligue cible</th>
                    <th>Récompense</th>
                    <th>Action</th>
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
                                aria-label={`${labels[league]} ligne ${index + 1} ${field}`}
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
                                    ? "Entre 0 et 100 requis."
                                    : "Ce champ est obligatoire."}
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
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty">Aucune plage confirmée.</p>
          )}
        </section>
      ))}
      <button className="primary-button" type="button" onClick={save}>
        Enregistrer le classement
      </button>
      {message && (
        <p
          className={
            message.startsWith("Configuration") ? "form-success" : "form-status"
          }
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
