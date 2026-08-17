"use client";

import { useState } from "react";
import { equipmentSkillLabels } from "../lib/equipment";
import type {
  CombatReferenceRow,
  ExpeditionReferenceRow,
} from "../lib/reference-equipment";

function OptionalNumber({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
}) {
  const change = (direction: number) =>
    onChange(
      String(
        Math.max(
          0,
          Math.round(((Number(value) || 0) + direction * step) * 1000) / 1000,
        ),
      ),
    );
  return (
    <div className="number-stepper">
      <button
        type="button"
        aria-label={`Diminuer ${label}`}
        onClick={() => change(-1)}
      >
        −
      </button>
      <input
        aria-label={label}
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={`Augmenter ${label}`}
        onClick={() => change(1)}
      >
        +
      </button>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

async function saveRows(
  url: string,
  rows: unknown,
  setStatus: (value: string) => void,
) {
  setStatus("Enregistrement…");
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rows),
  });
  setStatus(
    response.ok ? "Référentiel enregistré" : "Échec de l’enregistrement",
  );
}

export function CombatReferenceAdmin({
  initialRows,
}: {
  initialRows: CombatReferenceRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState("");
  const update = (
    index: number,
    field: keyof CombatReferenceRow,
    value: string,
  ) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  return (
    <div className="calculator-stack">
      <p>
        Les 180 lignes et toutes leurs colonnes sont éditables. Ne renseigne une
        valeur inconnue qu’après confirmation en jeu.
      </p>
      <div className="ranking-table-wrap">
        <table className="ranking-table reference-admin-table">
          <thead>
            <tr>
              <th>Rareté</th>
              <th>Set / famille</th>
              <th>Pouciel / gemmes</th>
              <th>Emplacement</th>
              {[1, 2, 3, 4].map((item) => (
                <th key={item}>Compétence {item} / %</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <Text
                    label={`Ligne ${index + 1} rareté`}
                    value={row.rarity}
                    onChange={(value) => update(index, "rarity", value)}
                  />
                </td>
                <td>
                  <Text
                    label={`Ligne ${index + 1} set`}
                    value={row.set_name}
                    onChange={(value) => update(index, "set_name", value)}
                  />
                  <Text
                    label={`Ligne ${index + 1} famille`}
                    value={row.family}
                    onChange={(value) => update(index, "family", value)}
                  />
                </td>
                <td>
                  <OptionalNumber
                    label={`Ligne ${index + 1} pouciel`}
                    value={row.skydust}
                    onChange={(value) => update(index, "skydust", value)}
                  />
                  <OptionalNumber
                    label={`Ligne ${index + 1} gemmes`}
                    value={row.gem_slots}
                    onChange={(value) => update(index, "gem_slots", value)}
                  />
                </td>
                <td>
                  <Text
                    label={`Ligne ${index + 1} type emplacement`}
                    value={row.slot_type}
                    onChange={(value) => update(index, "slot_type", value)}
                  />
                  <Text
                    label={`Ligne ${index + 1} nom emplacement`}
                    value={row.slot_name}
                    onChange={(value) => update(index, "slot_name", value)}
                  />
                </td>
                {([1, 2, 3, 4] as const).map((number) => (
                  <td key={number}>
                    <input
                      aria-label={`Ligne ${index + 1} compétence ${number}`}
                      list="combat-skills"
                      value={
                        row[`skill_${number}`] === "Inconnu"
                          ? ""
                          : row[`skill_${number}`]
                      }
                      placeholder="Inconnu"
                      onChange={(event) =>
                        update(
                          index,
                          `skill_${number}`,
                          event.target.value || (number === 1 ? "Inconnu" : ""),
                        )
                      }
                    />
                    <OptionalNumber
                      label={`Ligne ${index + 1} valeur ${number}`}
                      value={row[`value_${number}_pct`]}
                      step={0.1}
                      onChange={(value) =>
                        update(index, `value_${number}_pct`, value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="combat-skills">
        {equipmentSkillLabels.map((skill) => (
          <option key={skill} value={skill} />
        ))}
      </datalist>
      <button
        type="button"
        className="primary-button"
        onClick={() =>
          saveRows("/api/admin/references/combat", rows, setStatus)
        }
      >
        Enregistrer toute la table
      </button>
      <p role="status">{status}</p>
    </div>
  );
}

export function ExpeditionReferenceAdmin({
  initialRows,
}: {
  initialRows: ExpeditionReferenceRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState("");
  const update = (
    index: number,
    field: keyof ExpeditionReferenceRow,
    value: string,
  ) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  return (
    <div className="calculator-stack">
      <p>
        Les 120 lignes Expédition sont intégralement éditables. Les règles de
        confirmation par statistique restent affichées côté public.
      </p>
      <div className="ranking-table-wrap">
        <table className="ranking-table reference-admin-table">
          <thead>
            <tr>
              <th>Rareté</th>
              <th>Set</th>
              <th>Famille</th>
              <th>Emplacement</th>
              <th>% type</th>
              <th>Stat secondaire</th>
              <th>% secondaire</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <Text
                    label={`Expédition ligne ${index + 1} rareté`}
                    value={row.rarity}
                    onChange={(value) => update(index, "rarity", value)}
                  />
                </td>
                <td>
                  <Text
                    label={`Expédition ligne ${index + 1} set`}
                    value={row.set_name}
                    onChange={(value) => update(index, "set_name", value)}
                  />
                </td>
                <td>
                  <Text
                    label={`Expédition ligne ${index + 1} famille`}
                    value={row.family}
                    onChange={(value) => update(index, "family", value)}
                  />
                </td>
                <td>
                  <Text
                    label={`Expédition ligne ${index + 1} emplacement`}
                    value={row.slot}
                    onChange={(value) => update(index, "slot", value)}
                  />
                </td>
                <td>
                  <OptionalNumber
                    label={`Expédition ligne ${index + 1} valeur type`}
                    value={row.type_stat_pct}
                    step={0.1}
                    onChange={(value) => update(index, "type_stat_pct", value)}
                  />
                </td>
                <td>
                  <Text
                    label={`Expédition ligne ${index + 1} stat secondaire`}
                    value={row.secondary_stat_name}
                    onChange={(value) =>
                      update(index, "secondary_stat_name", value)
                    }
                  />
                </td>
                <td>
                  <OptionalNumber
                    label={`Expédition ligne ${index + 1} valeur secondaire`}
                    value={row.secondary_stat_pct}
                    step={0.1}
                    onChange={(value) =>
                      update(index, "secondary_stat_pct", value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="primary-button"
        onClick={() =>
          saveRows("/api/admin/references/expedition", rows, setStatus)
        }
      >
        Enregistrer toute la table
      </button>
      <p role="status">{status}</p>
    </div>
  );
}

export function TemplarReferenceAdmin({
  initialCosts,
}: {
  initialCosts: number[];
}) {
  const [costs, setCosts] = useState(initialCosts);
  const [status, setStatus] = useState("");
  return (
    <div className="calculator-stack">
      <p>Tous les niveaux de la table exacte sont éditables.</p>
      <table className="ranking-table">
        <thead>
          <tr>
            <th>Niveau actuel</th>
            <th>Coût du niveau</th>
          </tr>
        </thead>
        <tbody>
          {costs.map((cost, level) => (
            <tr key={level}>
              <td>{level}</td>
              <td>
                <OptionalNumber
                  label={`Coût Templier niveau ${level}`}
                  value={String(cost)}
                  onChange={(value) =>
                    setCosts((current) =>
                      current.map((item, index) =>
                        index === level ? Number(value) : item,
                      ),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="primary-button"
        onClick={() =>
          saveRows(
            "/api/admin/references/templars",
            costs.map((cost, level) => ({ level, cost })),
            setStatus,
          )
        }
      >
        Enregistrer toute la table
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
